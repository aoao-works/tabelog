let map;
let markers = [];
let restaurantData = [];
let draftMarker = null;
let infoWindow = null;

// GitHub設定 (実装時に自分のリポジトリ情報に書き換えてください)
const GITHUB_CONFIG = {
    owner: 'YOUR_USERNAME',
    repo: 'YOUR_REPO_NAME',
    path: 'data.json',
    token: 'YOUR_PERSONAL_ACCESS_TOKEN' // ※本番環境ではセキュリティ上、バックエンドを介すのが理想です
};

// 1. Google Map 初期化
function initMap() {
    const itlCampus = { lat: 35.6938, lng: 139.7366 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: itlCampus,
    });
    infoWindow = new google.maps.InfoWindow();

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
}

function normalizeRestaurant(res) {
    return {
        ...res,
        genres: Array.isArray(res.genres) ? res.genres : (res.genre ? [res.genre] : []),
        lat: Number(res.lat),
        lng: Number(res.lng)
    };
}

// 2. データの読み込み (GitHub上のdata.jsonを取得)
// app.js の 22行目付近を修正
async function loadData() {
    try {
        // GitHubのURLではなく、同じフォルダにある data.json を読み込むように変更
        const response = await fetch('./data.json'); 
        
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        
        restaurantData = await response.json();
        renderRestaurants(restaurantData);
    } catch (error) {
        console.error("データ取得失敗:", error);
    }
}

// 3. リストとマーカーの描画
function renderRestaurants(data) {
    const list = document.getElementById('restaurant-list');
    list.innerHTML = '';

    // 既存マーカーの削除
    markers.forEach(m => m.setMap(null));
    markers = [];

    data
        .map(normalizeRestaurant)
        .filter(res => Number.isFinite(res.lat) && Number.isFinite(res.lng))
        .forEach(res => {
            // リスト追加
            const card = document.createElement('div');
            card.className = 'restaurant-card';
            card.innerHTML = `
            <div>
                <strong>${res.name}</strong> [${res.genres.join(', ')}]
            </div>
            <div class="time-badge ${res.is_within_50 ? 'badge-ok' : 'badge-ng'}">
                ${res.is_within_50 ? '50分以内 OK' : '50分超過'}
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
                <div style="min-width: 180px;">
                    <strong>${res.name}</strong><br>
                    ${res.genres.join(', ')}<br>
                    ${res.is_within_50 ? '50分以内 OK' : '50分超過'}
                </div>
            `);
                infoWindow.open(map, marker);
            });

            card.addEventListener('click', () => {
                map.panTo(marker.getPosition());
                map.setZoom(Math.max(map.getZoom(), 17));
                google.maps.event.trigger(marker, 'click');
            });

            markers.push(marker);
        });
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
        is_within_50: document.getElementById('is_within_50').checked,
        lat: draftMarker.getPosition().lat(),
        lng: draftMarker.getPosition().lng()
    };

    alert("GitHub APIの更新処理を実行します（トークンと権限設定が必要です）");
    // 実装プロセス:
    // 1. 現在のdata.jsonをAPIで取得し、SHAハッシュを得る
    // 2. 新しいデータを追加したJSONを作成
    // 3. PUTリクエストでGitHub上のファイルを更新コミットする
});