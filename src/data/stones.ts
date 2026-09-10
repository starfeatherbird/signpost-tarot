/**
 * 상징 스톤 데이터.
 * 스톤은 결과에서 고른 태도·행동을 떠올리게 하는 "상징물"입니다. 치료 효능이나 운을 약속하지 않습니다.
 * 서버 함수도 같은 목록을 씁니다 (scripts/export-cards.mjs → supabase/functions/_shared/stones.json).
 * id 는 저장된 기록·서버 스키마에 쓰이므로 바꾸지 않습니다(표시 이름만 바꿉니다).
 * 그림: app/stone_asset/<id>.png 를 두면 scripts/sync-stones.mjs 가 public/stones/<id>.webp 로 줄여 넣고,
 * 없으면 대표 색으로 그린 보석 모양(StoneGem)을 씁니다.
 */
export interface Stone {
  id: string;
  nameKo: string;
  nameEn: string;
  /** 보석 그림(그림 파일이 없을 때)과 강조에 쓰는 대표 색 */
  color: string;
  /** 이 돌이 상징하는 태도 (짧은 명사구) */
  symbol: string;
  /** 어떤 고민·상태에 어울리는지 (모델·모의 분석의 선택 기준) */
  themes: string[];
  /** 내 공간에서 보여 주는 한 줄 설명 */
  description: string;
}

export const STONES: Stone[] = [
  {
    id: 'moonstone',
    nameKo: '문스톤',
    nameEn: 'Moonstone',
    color: '#C9D3E8',
    symbol: '단정하지 않기',
    themes: ['불확실함', '추측', '기다림', '상대의 마음을 모를 때'],
    description: '확인되지 않은 마음을 단정하지 않고, 사실과 추측을 나눠 보는 태도의 상징이에요.',
  },
  {
    id: 'rose-quartz',
    nameKo: '로즈쿼츠',
    nameEn: 'Rose Quartz',
    color: '#F2B8C6',
    symbol: '나에게 다정하기',
    themes: ['자책', '관계의 온기', '지친 마음', '위로'],
    description: '스스로를 몰아세우는 대신 다정하게 대하기로 한 약속의 상징이에요.',
  },
  {
    id: 'amethyst',
    nameKo: '자수정',
    nameEn: 'Amethyst',
    color: '#9B6FD1',
    symbol: '잠시 멈추기',
    themes: ['불안', '조급함', '가라앉히기', '답장 전에 멈추기'],
    description: '반응하기 전에 한 번 멈추고 숨을 고르는 태도의 상징이에요.',
  },
  {
    id: 'citrine',
    nameKo: '시트린',
    nameEn: 'Citrine',
    color: '#F1C24B',
    symbol: '시작할 용기',
    themes: ['새 시작', '망설임', '자신감', '첫걸음'],
    description: '완벽하지 않아도 첫걸음을 떼기로 한 마음의 상징이에요.',
  },
  {
    id: 'black-tourmaline',
    nameKo: '블랙 투어멀린',
    nameEn: 'Black Tourmaline',
    color: '#4A4658',
    symbol: '경계 지키기',
    themes: ['거절', '경계', '무리한 부탁', '나를 지키기'],
    description: '무리한 요구 앞에서 내 경계를 분명히 하기로 한 약속의 상징이에요.',
  },
  {
    id: 'clear-quartz',
    nameKo: '백수정',
    nameEn: 'Clear Quartz',
    color: '#E8EEF5',
    symbol: '사실 확인하기',
    themes: ['명료함', '정보 부족', '사실 확인', '헷갈릴 때'],
    description: '느낌보다 확인된 사실을 먼저 적어 보는 태도의 상징이에요.',
  },
  {
    id: 'tiger-eye',
    nameKo: '타이거아이',
    nameEn: "Tiger's Eye",
    color: '#B67A2A',
    symbol: '한 걸음씩 꾸준히',
    themes: ['끈기', '준비', '긴 과정', '지루한 반복'],
    description: '큰 일을 작은 단계로 나눠 하나씩 해 나가기로 한 마음의 상징이에요.',
  },
  {
    id: 'lapis-lazuli',
    nameKo: '라피스 라줄리',
    nameEn: 'Lapis Lazuli',
    color: '#2B4C9B',
    symbol: '솔직하게 말하기',
    themes: ['표현', '대화', '말하지 못한 것', '오해'],
    description: '돌려 말하지 않고 내 생각을 솔직하게 전하기로 한 약속의 상징이에요.',
  },
  {
    id: 'aventurine',
    nameKo: '아벤츄린',
    nameEn: 'Aventurine',
    color: '#5DBB8A',
    symbol: '새로운 시도',
    themes: ['기회', '변화', '이직', '낯선 길'],
    description: '익숙함 밖으로 한 발 내디뎌 보기로 한 마음의 상징이에요.',
  },
  {
    id: 'carnelian',
    nameKo: '카넬리안',
    nameEn: 'Carnelian',
    color: '#D9633B',
    symbol: '미루지 않기',
    themes: ['결단', '행동력', '미루기', '에너지'],
    description: '생각만 하던 일을 오늘 실제로 움직여 보기로 한 약속의 상징이에요.',
  },
  {
    id: 'jade',
    nameKo: '제이드',
    nameEn: 'Jade',
    color: '#6FA88C',
    symbol: '균형 찾기',
    themes: ['균형', '과로', '쉼', '무리하지 않기'],
    description: '일과 쉼, 나와 남 사이의 균형을 다시 맞추기로 한 마음의 상징이에요.',
  },
  {
    id: 'aquamarine',
    nameKo: '아쿠아마린',
    nameEn: 'Aquamarine',
    color: '#7FC8D8',
    symbol: '흐름에 맡기기',
    themes: ['기다림', '통제할 수 없는 일', '내려놓기', '시간이 필요할 때'],
    description: '내가 정할 수 없는 부분은 흐름에 맡기고 지켜보기로 한 태도의 상징이에요.',
  },
  {
    id: 'amazonite',
    nameKo: '아마조나이트',
    nameEn: 'Amazonite',
    color: '#7FCBB8',
    symbol: '내 기준으로 보기',
    themes: ['남의 시선', '비교', '눈치', '자기 기준'],
    description: '다른 사람의 평가보다 내가 정한 기준으로 판단하기로 한 마음의 상징이에요.',
  },
  {
    id: 'larimar',
    nameKo: '라리마',
    nameEn: 'Larimar',
    color: '#8FD0E6',
    symbol: '부드럽게 말하기',
    themes: ['다툼', '감정이 격해질 때', '차분한 대화', '화'],
    description: '감정이 올라올 때도 목소리를 낮추고 차분하게 전하기로 한 약속의 상징이에요.',
  },
  {
    id: 'labradorite',
    nameKo: '라브라도라이트',
    nameEn: 'Labradorite',
    color: '#5E6F9A',
    symbol: '직감 믿어 보기',
    themes: ['과한 분석', '결정 미루기', '직감', '머리로만 재기'],
    description: '따져 보기만 하다 멈춰 있을 때, 처음 느낀 방향도 근거로 삼아 보기로 한 마음의 상징이에요.',
  },
  {
    id: 'garnet',
    nameKo: '가넷',
    nameEn: 'Garnet',
    color: '#9B2335',
    symbol: '초심 떠올리기',
    themes: ['의욕 저하', '권태', '초심', '지친 일에 의미 찾기'],
    description: '지쳐 버린 일에서 처음 시작했던 이유를 다시 꺼내 보기로 한 약속의 상징이에요.',
  },
  {
    id: 'pietersite',
    nameKo: '피터사이트',
    nameEn: 'Pietersite',
    color: '#4A5568',
    symbol: '혼란 속 중심 잡기',
    themes: ['혼란', '갑작스러운 변화', '정보 과잉', '소음'],
    description: '주변이 어수선할수록 내가 지킬 한 가지를 먼저 정하기로 한 마음의 상징이에요.',
  },
  {
    id: 'selenite',
    nameKo: '셀레나이트',
    nameEn: 'Selenite',
    color: '#EDEDF2',
    symbol: '머리 비우기',
    themes: ['생각 과다', '잠 못 드는 밤', '정리', '쌓인 걱정'],
    description: '꼬리를 무는 생각을 종이에 옮기고 머리를 비워 두기로 한 약속의 상징이에요.',
  },
  {
    id: 'obsidian',
    nameKo: '흑요석',
    nameEn: 'Obsidian',
    color: '#1F1D26',
    symbol: '불편한 사실 마주하기',
    themes: ['회피', '미뤄 둔 문제', '직면', '피하고 싶은 진실'],
    description: '피해 온 사실을 한 번은 정면으로 보기로 한 마음의 상징이에요.',
  },
];

const STONE_BY_ID = new Map(STONES.map((s) => [s.id, s]));

export function getStone(id: string): Stone | undefined {
  return STONE_BY_ID.get(id);
}
