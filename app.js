let map;
let markers = [];
let restaurantData = [];
let draftMarker = null;
let infoWindow = null;
let currentFilteredData = [];
let sortOrder = 'default';
let searchQuery = '';

// GitHub設定 (実装時に自分のリポジトリ情報に書き換えてください)
const GITHUB_CONFIG = {
    owner: 'aoao-works',
    repo: 'tabelog',
    path: 'data.json'
};

// 1. Google Map 初期化
function initMap() {
    const itlCampus = { lat: 35.6938, lng: 139.7366 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: itlCampus,
    });
    infoWindow = new google.maps.InfoWindow();

    draftMarker = new google.maps.Marker({
        position: itlCampus,
        map: map,
        title: "中央大学国際情報学部（iTL）",
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
    });

    // 【追加】地図をクリックした時にピンを立てる処理
    map.addListener("click", (event) => {
        // すでにピンがあれば位置を移動、なければ新しく作成
        if (draftMarker) {
            draftMarker.setPosition(event.latLng);
        } else {
            draftMarker = new google.maps.Marker({
                position: event.latLng,
                map: map,
                title: "新規追加するお店の位置",
                icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" // 既存の赤ピンと区別するために緑色に設定
            });
        }
    });

    // データの読み込み
    loadData();

    // フィルター機能の初期化
    initializeFilters();
}

// 2. データの読み込み (ローカルまたはGitHub上のdata.jsonを取得)
async function loadData() {
    try {
        const response = await fetch('./data.json');

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }

        restaurantData = await response.json();
        console.log('📥 データ読み込み成功:', restaurantData.length, '件');
        console.log('最初の店:', restaurantData[0]);
        applyFilters();
    } catch (error) {
        console.error("❌ データ取得失敗:", error);
    }
}

function normalizeRestaurant(res) {
    const walkingRoundTrip = (Number(res.walking_minutes_one_way) || 0) * 2;
    const eatingTime = Number(res.eating_minutes) || 30;
    const totalTime = walkingRoundTrip + eatingTime;

    const normalized = {
        ...res,
        genres: Array.isArray(res.genres) ? res.genres : (res.genre ? [res.genre] : []),
        lat: Number(res.lat),
        lng: Number(res.lng),
        walking_minutes_one_way: Number(res.walking_minutes_one_way) || 0,
        eating_minutes: eatingTime,
        walking_minutes_round_trip: walkingRoundTrip,
        total_time_minutes: totalTime
    };

    if (!Number.isFinite(normalized.lat) || !Number.isFinite(normalized.lng)) {
        console.warn(`⚠️  無効な座標: ${res.name}`, { lat: res.lat, lng: res.lng });
    }

    return normalized;
}

// フィルター処理
function applyFilters() {
    const selectedGenre = document.getElementById('genre-filter').value;
    const within50Only = document.getElementById('within-50-only').checked;
    sortOrder = document.getElementById('sort-select').value;
    searchQuery = document.getElementById('search-input').value.toLowerCase();

    currentFilteredData = restaurantData
        .map(normalizeRestaurant)
        .filter(res => {
            // 検索でフィルタ
            if (searchQuery && !res.name.toLowerCase().includes(searchQuery)) {
                return false;
            }
            // ジャンルでフィルタ
            if (selectedGenre !== 'all' && !res.genres.includes(selectedGenre)) {
                return false;
            }
            // 50分以内でフィルタ
            if (within50Only && res.total_time_minutes > 50) {
                return false;
            }
            return true;
        });

    // ソート処理
    sortRestaurants(currentFilteredData);
    renderRestaurants(currentFilteredData);
}

// ソート処理
function sortRestaurants(data) {
    switch (sortOrder) {
        case 'time-asc':
            data.sort((a, b) => a.total_time_minutes - b.total_time_minutes);
            break;
        case 'time-desc':
            data.sort((a, b) => b.total_time_minutes - a.total_time_minutes);
            break;
        case 'price-asc':
            data.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case 'price-desc':
            data.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case 'walking-asc':
            data.sort((a, b) => a.walking_minutes_round_trip - b.walking_minutes_round_trip);
            break;
        default:
            // デフォルトは元の順序を保つ
            break;
    }
}

// フィルター機能の初期化
function initializeFilters() {
    const genreFilter = document.getElementById('genre-filter');
    const within50Checkbox = document.getElementById('within-50-only');
    const sortSelect = document.getElementById('sort-select');
    const searchInput = document.getElementById('search-input');
    const randomBtn = document.getElementById('random-btn');
    const resetBtn = document.getElementById('reset-btn');

    genreFilter.addEventListener('change', applyFilters);
    within50Checkbox.addEventListener('change', applyFilters);
    sortSelect.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);
    randomBtn.addEventListener('click', randomPick);
    resetBtn.addEventListener('click', resetFilters);

    // 初回表示
    applyFilters();
}

// ランダム選択機能
function randomPick() {
    if (currentFilteredData.length === 0) {
        alert('選択可能なレストランがありません');
        return;
    }
    const randomIndex = Math.floor(Math.random() * currentFilteredData.length);
    const selectedRestaurant = currentFilteredData[randomIndex];

    // 対応するマーカーを見つけてクリック
    const markerToClick = markers.find(m => m.restaurantData.name === selectedRestaurant.name);
    if (markerToClick) {
        google.maps.event.trigger(markerToClick, 'click');
        map.panTo(markerToClick.getPosition());
        map.setZoom(Math.max(map.getZoom(), 17));
    }

    alert(`🎯 今日のお店: ${selectedRestaurant.name}\n${selectedRestaurant.genres.join(', ')}`);
}

// リセット機能
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('genre-filter').value = 'all';
    document.getElementById('sort-select').value = 'default';
    document.getElementById('within-50-only').checked = false;
    applyFilters();
}

// 3. リストとマーカーの描画
function renderRestaurants(data) {
    const list = document.getElementById('restaurant-list');
    list.innerHTML = '';

    // 既存マーカーの削除
    markers.forEach(m => m.setMap(null));
    markers = [];

    console.log('🎯 renderRestaurants 呼び出し:', data.length, '件のデータ');

    data
        .map(normalizeRestaurant)
        .filter(res => Number.isFinite(res.lat) && Number.isFinite(res.lng))
        .forEach((res, index) => {
            console.log(`📍 マーカー作成 [${index}]:`, res.name, `(${res.lat}, ${res.lng})`);

            // リスト追加
            const card = document.createElement('div');
            card.className = 'restaurant-card';
            card.innerHTML = `
            <div>
                <strong>${res.name}</strong> [${res.genres.join(', ')}]
            </div>
            <div class="time-badge ${res.total_time_minutes <= 50 ? 'badge-ok' : 'badge-ng'}">
                往復${res.walking_minutes_round_trip}分 + 食事${res.eating_minutes}分 = ${res.total_time_minutes}分
            </div>
            <div style="font-size: 0.9rem; color: #666;">
                価格: ${res.price ? res.price + '円' : '未定'}
            </div>
        `;
            list.appendChild(card);

            // マップにマーカー追加
            const marker = new google.maps.Marker({
                position: { lat: res.lat, lng: res.lng },
                map: map,
                title: res.name
            });

            marker.addListener('click', () => {
                infoWindow.setContent(`
                <div style="min-width: 200px;">
                    <strong>${res.name}</strong><br>
                    ${res.genres.join(', ')}<br>
                    往復${res.walking_minutes_round_trip}分 + 食事${res.eating_minutes}分 = ${res.total_time_minutes}分<br>
                    価格: ${res.price ? res.price + '円' : '未定'}
                </div>
            `);
                infoWindow.open(map, marker);
            });

            card.addEventListener('click', () => {
                map.panTo(marker.getPosition());
                map.setZoom(Math.max(map.getZoom(), 17));
                google.maps.event.trigger(marker, 'click');
            });

            // マーカーにレストランデータを付加
            marker.restaurantData = res;
            markers.push(marker);
        });

    // 結果件数を表示
    const resultCount = document.getElementById('result-count');
    if (data.length === 0) {
        resultCount.textContent = '検索結果: 0件';
    } else {
        resultCount.textContent = `検索結果: ${data.length}件`;
    }
}

// 4. 投稿機能 (GitHub APIを使用してファイルを更新)
document.getElementById('restaurant-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. 選択されたチェックボックスをすべて取得して配列化
    const selectedGenres = Array.from(document.querySelectorAll('input[name="genre"]:checked'))
        .map(cb => cb.value);

    // 2. 最低1つは選択されているかバリデーション
    if (selectedGenres.length === 0) {
        alert("ジャンルを1つ以上選択してください。");
        return;
    }

    if (!draftMarker) {
        alert("地図上をクリックして、お店の位置にピンを立ててください。");
        return;
    }

    // 3. データ構造を更新
    const newEntry = {
        name: document.getElementById('name').value,
        genres: selectedGenres,
        walking_minutes_one_way: 5,
        eating_minutes: 30,
        lat: draftMarker.getPosition().lat(),
        lng: draftMarker.getPosition().lng()
    };

    alert("GitHub APIの更新処理を実行します（トークンと権限設定が必要です）");
    // 実装プロセス:
    // 1. 現在のdata.jsonをAPIで取得し、SHAハッシュを得る
    // 2. 新しいデータを追加したJSONを作成
    // 3. PUTリクエストでGitHub上のファイルを更新コミットする
});