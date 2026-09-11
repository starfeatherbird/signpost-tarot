# -*- coding: utf-8 -*-
"""
상징 스톤 원본(stone_source/*.png, 검정 배경 1024px)을 앱용 투명 에셋으로 가공합니다.
사양: docs/stone_asset_handoff.md

  py -3 scripts/process_stones.py            전체 19종 처리
  py -3 scripts/process_stones.py obsidian   일부만 (파일명 일부)
  py -3 scripts/process_stones.py --no-rembg 세그멘테이션 모델 없이(가장자리 연결 배경 제거) — 비상용

처리 순서
  1) 돌별 전처리: clear-quartz 좌우 반전 / obsidian 반점 제거 → 주대각선 반사
  2) 배경 제거: rembg(isnet-general-use) 세그멘테이션 → 가장 큰 연결 영역만 → 내부 구멍 채움 → 가장자리 1.5px 부드럽게
  3) 디프린지: 가장자리 픽셀 RGB 를 원래 덮임 비율(α)로 나눠 검정 오염 제거
  4) 크기 정규화: 면적 비율 0.37 기준, 긴 변 상한 90%, 캔버스 중앙
  5) 내보내기: public/stones/<id>.webp (320px, 투명) + stone_work/masters/<id>.png (1024px 투명 마스터)
     + public/stones/manifest.json (처리 이력) + stone_work/preview.png (검수 시트)
원본 폴더 stone_source/ 는 읽기만 합니다. 그림자는 넣지 않습니다(테마별 그림자는 CSS).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "stone_source"
WORK = ROOT / "stone_work"
MASTERS = WORK / "masters"
OUT = ROOT / "public" / "stones"

CANVAS = 320          # 앱 관례: 48px 표시의 6배 여유. (핸드오프 기본안 256 대신 기존 카드/스톤 규칙에 맞춤)
TARGET_AREA = 0.37    # 캔버스 대비 돌 알파 면적 비율
MAX_LONG = 0.90       # 긴 변 상한
EDGE_SOFT_PX = 1.5    # 가장자리 부드럽게 할 폭
WEBP_QUALITY = 90

# 돌별 전처리 (파일명 → 처리 이름 목록)
SPECIAL = {
    "clear-quartz": ["mirror"],
    "obsidian": ["despeckle", "transpose"],
}

# ---------------------------------------------------------------------------
# 1) 전처리

def despeckle(rgb: np.ndarray) -> tuple[np.ndarray, dict]:
    """흑요석 몸통의 흰 반점을 주변 색(median)으로 메웁니다. 파라미터는 핸드오프 문서의 검증값."""
    rgb = rgb.astype(np.float32)
    lum = rgb.mean(axis=2)
    mask = lum > 14
    mask = ndi.binary_closing(mask, iterations=10)
    mask = ndi.binary_fill_holes(mask)
    mask = largest_component(mask)
    inner = ndi.binary_erosion(mask, iterations=10)
    protect = lum > 100
    protect = ndi.binary_opening(protect, iterations=3)
    protect = ndi.binary_dilation(protect, iterations=5)

    def metric(arr: np.ndarray) -> float:
        e = ndi.binary_erosion(mask, iterations=20)
        l = arr.mean(axis=2)
        m7 = ndi.median_filter(l, size=7)
        bad = (l - m7 > 30) & (l < 150) & e
        return float(bad.sum()) / max(1, int(e.sum())) * 1000

    before = metric(rgb)
    for size, thr, max_px in ((7, 8, 20), (11, 8, 40)):
        med = np.stack([ndi.median_filter(rgb[..., c], size=size) for c in range(3)], axis=2)
        lum = rgb.mean(axis=2)
        cand = (lum - med.mean(axis=2) > thr) & inner & ~protect
        labels, n = ndi.label(cand)
        if n == 0:
            continue
        sizes = ndi.sum(cand, labels, index=np.arange(1, n + 1))
        keep_ids = np.flatnonzero(sizes <= max_px) + 1
        keep = np.isin(labels, keep_ids)
        keep = ndi.binary_dilation(keep, iterations=1) & inner
        rgb[keep] = med[keep]
    after = metric(rgb)
    return np.clip(rgb, 0, 255).astype(np.uint8), {"speckle_before_per_1000": round(before, 2), "speckle_after_per_1000": round(after, 2)}


def preprocess(name: str, img: Image.Image) -> tuple[Image.Image, list[str], dict]:
    applied: list[str] = []
    info: dict = {}
    for step in SPECIAL.get(name, []):
        if step == "mirror":
            img = ImageOps.mirror(img)
        elif step == "transpose":
            img = img.transpose(Image.Transpose.TRANSPOSE)  # 주대각선 반사 (회전 아님)
        elif step == "despeckle":
            arr, m = despeckle(np.asarray(img.convert("RGB")))
            img = Image.fromarray(arr, "RGB")
            info.update(m)
        applied.append(step)
    return img, applied, info

# ---------------------------------------------------------------------------
# 2) 배경 제거

def largest_component(mask: np.ndarray) -> np.ndarray:
    labels, n = ndi.label(mask)
    if n <= 1:
        return mask
    sizes = ndi.sum(mask, labels, index=np.arange(1, n + 1))
    return labels == (int(np.argmax(sizes)) + 1)


_session = None

def segment_rembg(img: Image.Image) -> np.ndarray:
    """rembg 세그멘테이션 마스크(0~255, float32)."""
    global _session
    from rembg import new_session, remove
    if _session is None:
        _session = new_session("isnet-general-use")
    mask = remove(img.convert("RGB"), session=_session, only_mask=True)
    return np.asarray(mask.convert("L")).astype(np.float32)


def segment_flood(img: Image.Image) -> np.ndarray:
    """비상용: 가장자리에서 이어진 검정 배경만 지움 (돌 안쪽 어두운 부분은 남김)."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    near_bg = np.sqrt((rgb ** 2).sum(axis=2)) < 24
    labels, n = ndi.label(near_bg)
    border_ids = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    bg = np.isin(labels, list(border_ids))
    return np.where(bg, 0.0, 255.0).astype(np.float32)


def clean_alpha(soft: np.ndarray) -> tuple[np.ndarray, dict]:
    """가장 큰 조각만 남기고, 내부 구멍을 채우고, 가장자리만 부드럽게."""
    hard = soft > 127
    labels, n = ndi.label(hard)
    debris = max(0, n - 1)
    hard = largest_component(hard)
    holes_before = int(ndi.label(~hard & ndi.binary_fill_holes(hard))[1])
    hard = ndi.binary_fill_holes(hard)
    dist = ndi.distance_transform_edt(hard)
    alpha = np.clip(dist / EDGE_SOFT_PX, 0, 1) * 255
    return alpha.astype(np.float32), {"debris_removed": debris, "holes_filled": holes_before}

# ---------------------------------------------------------------------------
# 3) 디프린지 (검정 배경: 관측색 = 돌색 × 덮임 비율)

def defringe(rgb: np.ndarray, coverage: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """가장자리 띠(알파 경계 3px 안)의 RGB 를 원래 덮임 비율로 나눠 검정 오염을 걷어 냅니다."""
    out = rgb.astype(np.float32)
    inside = alpha > 0
    band = inside & ~ndi.binary_erosion(inside, iterations=3)
    cov = np.clip(coverage / 255.0, 0.0, 1.0)
    # 세그멘테이션 마스크는 가장자리에서 실제 덮임보다 넓을 수 있어, 밝기 기반 덮임(관측 밝기/안쪽 밝기)과 섞어 씁니다.
    lum = out.mean(axis=2)
    ring_ref = ndi.uniform_filter(np.where(inside, lum, 0), size=9) / np.maximum(ndi.uniform_filter(inside.astype(np.float32), size=9), 1e-3)
    est = np.clip(lum / np.maximum(ring_ref, 1), 0.05, 1.0)
    a = np.where(band, np.minimum(cov, est), 1.0)
    a = np.clip(a, 0.15, 1.0)
    for c in range(3):
        ch = out[..., c]
        ch[band] = ch[band] / a[band]
    return np.clip(out, 0, 255)

# ---------------------------------------------------------------------------
# 4) 크기 정규화

def normalize(rgba: np.ndarray) -> tuple[Image.Image, dict]:
    alpha = rgba[..., 3]
    ys, xs = np.nonzero(alpha > 8)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = Image.fromarray(rgba[y0:y1, x0:x1], "RGBA")
    area = float((alpha[y0:y1, x0:x1] / 255.0).sum())
    scale = float(np.sqrt(TARGET_AREA * CANVAS * CANVAS / max(area, 1)))
    long_side = max(crop.width, crop.height)
    capped = False
    if long_side * scale > CANVAS * MAX_LONG:
        scale = CANVAS * MAX_LONG / long_side
        capped = True
    w, h = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
    resized = crop.resize((w, h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(resized, ((CANVAS - w) // 2, (CANVAS - h) // 2), resized)
    ratio = float((np.asarray(canvas)[..., 3] / 255.0).sum()) / (CANVAS * CANVAS)
    return canvas, {"scale": round(scale, 4), "long_side_capped": capped, "area_ratio": round(ratio, 3), "size": [w, h]}

# ---------------------------------------------------------------------------

def process_one(path: Path, use_rembg: bool) -> dict:
    name = path.stem.lower()
    img = Image.open(path).convert("RGB")
    img, applied, info = preprocess(name, img)
    soft = segment_rembg(img) if use_rembg else segment_flood(img)
    alpha, ainfo = clean_alpha(soft)
    rgb = defringe(np.asarray(img).astype(np.float32), soft, alpha)
    rgba = np.dstack([rgb, alpha]).astype(np.uint8)
    master = Image.fromarray(rgba, "RGBA")
    MASTERS.mkdir(parents=True, exist_ok=True)
    master.save(MASTERS / f"{name}.png")
    final, ninfo = normalize(rgba)
    OUT.mkdir(parents=True, exist_ok=True)
    final.save(OUT / f"{name}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
    entry = {
        "file": f"{name}.webp",
        "source": str(path.relative_to(ROOT)).replace("\\", "/"),
        "applied": applied,
        "segmentation": "rembg:isnet-general-use" if use_rembg else "flood-fill",
        **ainfo, **ninfo, **info,
        "processed_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
    }
    return entry


def preview_sheet(names: list[str]) -> Path:
    """두 테마 × (48px, 36px, 2배 확대 96px) 검수 시트."""
    themes = [("#0F1A2E", (15, 26, 46)), ("#F5F7FB", (245, 247, 251))]
    sizes = [48, 36, 96]
    cell = 110
    cols = len(names)
    rows_per_theme = len(sizes)
    height = len(themes) * rows_per_theme * cell
    sheet = Image.new("RGB", (cols * cell, height), (0, 0, 0))
    for ti, (_, bg) in enumerate(themes):
        for si, size in enumerate(sizes):
            row_top = (ti * rows_per_theme + si) * cell
            band = Image.new("RGB", (cols * cell, cell), bg)
            for ci, n in enumerate(names):
                im = Image.open(OUT / f"{n}.webp").convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
                band.paste(im, (ci * cell + (cell - size) // 2, (cell - size) // 2), im)
            sheet.paste(band, (0, row_top))
    WORK.mkdir(parents=True, exist_ok=True)
    p = WORK / "preview.png"
    sheet.save(p)
    return p


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows 콘솔에서 한글 깨짐 방지
    except Exception:
        pass
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    use_rembg = "--no-rembg" not in sys.argv
    files = sorted(p for p in SRC.glob("*.png") if not args or any(a in p.stem for a in args))
    if not files:
        print(f"[stones] 처리할 원본이 없어요: {SRC}")
        return
    manifest_path = OUT / "manifest.json"
    manifest = {}
    if manifest_path.exists():
        try:
            manifest = {e["file"]: e for e in json.loads(manifest_path.read_text("utf-8")).get("stones", [])}
        except Exception:
            manifest = {}
    for p in files:
        entry = process_one(p, use_rembg)
        manifest[entry["file"]] = entry
        extra = ", ".join(f"{k}={v}" for k, v in entry.items() if k in ("applied", "debris_removed", "holes_filled", "scale", "long_side_capped", "area_ratio", "speckle_after_per_1000") and v not in ([], 0, False))
        print(f"[stones] {p.name} → {entry['file']}  {extra}")
    manifest_path.write_text(json.dumps({"canvas": CANVAS, "target_area": TARGET_AREA, "max_long": MAX_LONG, "stones": sorted(manifest.values(), key=lambda e: e["file"])}, ensure_ascii=False, indent=2) + "\n", "utf-8")
    all_names = sorted(p.stem.lower() for p in SRC.glob("*.png") if (OUT / f"{p.stem.lower()}.webp").exists())
    sheet = preview_sheet(all_names)
    print(f"[stones] {len(files)}개 처리, 매니페스트 {manifest_path.relative_to(ROOT)}, 검수 시트 {sheet.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
