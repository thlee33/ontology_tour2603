# 시공간 온톨로지 투어 (Spatiotemporal Ontology Tour Map)

![Preview](https://github.com/thlee33/ontology_tour2603/blob/main/demo.png) 

이 프로젝트는 **CesiumJS**의 3D 공간 정보 라이브러리와 **네트워크 그래프(Network Graph)** UI를 결합하여, 역사적 사건과 인물, 건축물 등을 3차원 공간에서 탐험할 수 있도록 만든 프론트엔드 웹 애플리케이션입니다.

"에펠탑(Eiffel Tower)"을 중심 노드로 시작하여, **인물(PERSON)**, **시간(TIME)**, **공간(SPACE)**, **문화(CULTURE)** 요소들이 온톨로지 트리(Ontology Tree) 형태로 얽힌 거대한 지식망을 탐구합니다. 파리를 넘어 런던, 뉴욕, 서울(대한제국)까지 연결된 글로벌 랜드마크의 관계를 입체적으로 확인할 수 있습니다.

## 🌟 주요 기능 (Key Features)

### 1. 3D 지구본 및 카메라 플라잉 엔진 (CesiumJS)
*   **Google Photorealistic 3D Tiles** 적용으로 현실적이고 정교한 3D 시티 뷰 제공.
*   특정 노드(장소) 선택 시 해당 랜드마크의 정확한 위치(위경도 및 고도)로 부드럽게 비행(FlyTo)하는 카메라 애니메이션.

### 2. 인터랙티브 SVG 네트워크 그래프 (Glassmorphism UI)
*   사용자가 클릭할 수 있는 네트워크 노드를 SVG를 사용해 시각화.
*   세련된 다크톤의 **글래스모피즘(Glassmorphism)** 효과와 스무스한 CSS 애니메이션 적용.
*   **온톨로지 필터(Ontology Filter)**: 카테고리(공간, 시간, 인물, 문화)별로 연관 노드만 선별해서 볼 수 있는 기능.

### 3. 시공간 온톨로지 데이터 (`story_tour.json`)
*   초기 파리 에펠탑에서 영국, 미국, 대한민국으로 꼬리에 꼬리를 무는 무한한 가능성 
*   **프랑스 파리**: 귀스타브 에펠, 가라비 고가교, 루브르 박물관, 개선문, 1889/1900 만국박람회 등.
*   **영국 (London)**: 빅 벤, 타워 브리지, 1851 런던 박람회(수정궁터).
*   **미국 (New York)**: 자유의 여신상(에펠의 골조 설계), 엘리스 섬, 센트럴 파크.
*   **대한민국 (Seoul)**: 1900 파리 박람회 대한제국관(모티브), 경복궁, N서울타워(통신탑 기원).

### 4. 확장 기능 (Expansion Features)
*   **자동 탐색 (Random Auto-Explorer)**: 스위치를 켜면 현재 노드와 이어져 있는 연관 노드 중 하나를 **무작위로 선택해** 멈추지 않고 스토리를 이어가는 오토 드라이브 텔레포트 뷰어 기능.
*   **통합 검색 바 (Search Node)**: 데이터 내 인물, 장소, 시간 등 모든 키워드로 연관 노드를 단숨에 찾아 이동할 수 있는 검색 & 드롭다운 기능.
*   **새로운 발견! (Lucky Random Jump)**: 완전히 예상치 못한 무작위의 시공간 데이터 한 곳으로 사용자를 워프(Warp)시키는 발견형 콘텐츠 요소.

---

## 🚀 프로젝트 구조 (Project Structure)

```text
cesiumjs_story_tour2/
├── index.html        # 메인 웹 페이지 레이아웃 및 UI 구조
├── css/
│   ├── style.css     # 코어 디자인 (Glassmorphism, Graph SVG, 애니메이션 등)
│   └── v2_addons.css # 검색 및 랜덤 버튼 관련 추가 커스텀 스타일
├── js/
│   └── app.js        # CesiumJS 뷰어 초기화, Data Manager, 이벤트 로직 통합 스크립트
└── data/
    └── story_tour.json # 모든 시공간 노드 정보와 연결성(Connections)이 담긴 JSON DB
```

---

---

## 🛠️ 사용 기술 스택 (Tech Stack)
*   **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Transform/Transition/SVG)
*   **Mapping Library**: CesiumJS (v1.114)
*   **Data Structure**: JSON (Spatiotemporal Node & Edge Mapping)
*   **Icons & Assets**: FontAwesome, Google Photorealistic 3D Tiles

---


