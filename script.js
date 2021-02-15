// ***** Global değişkenler
const website = "www.kevserinmutfagi.com/";
const sourceUrl = `https://public-api.wordpress.com/rest/v1/sites/${website}`;
const postRequest = {
    offset: 0,
    category: "",
    tag: "",
    number: 10
};
const tagRequest = {
    number: 100,
    order_by: "count",
    order: "DESC"
}
const uiValues = {
    categoryName: "Son Yazılar",
    tagName: "Etiketler",
    sourceName: "Son Yazılar",
    postCount: postRequest.number,
    reset: function() {
        this.categoryName = "Son Yazılar";
        this.tagName = "Etiketler";
        this.sourceName = "";
    }
};
const loadingIds = {
    post: "loading",
    category: "categoryLoading"
};
const pageBlock = {
    selected: 1,
    start: null,
    end: null,
    activeBlock: 0,
    totalPageCount: null,
    pagePerBlockCount: 10,
    totalBlockCount: null,
    totalPostCount: null,   // found
    blockChange: false,
    isLastBlock: false,
    reset: function() { //mutable(değişebilir)
        this.selected = 1;
        this.activeBlock = 0;
    }
};


window.addEventListener("load", () => {
    setListeners();
    loadPosts();
    loadCategories();
});


function getUrl(type) {
    postRequest.offset = getOffset();
    var paramsPosts = getParameters(postRequest);
    var paramsTags = getParameters(tagRequest);
    if (type == "posts") {
        var url = sourceUrl + "posts/?" + paramsPosts;
    } else if (type == "categories") {
        var url = sourceUrl + "categories";
    } else if (type == "tags") {
        var url = sourceUrl + "tags/?" + paramsTags;
    }
    return url;
}


function getUrlAsKey(type) {
    postRequest.offset = getOffset();
    var paramsPosts = getParameters(postRequest);
    var paramsTags = getParameters(tagRequest);
    if (type == "posts") {
        var urlAsKey =  "posts/?" + paramsPosts;
    } else if (type == "categories") {
        var urlAsKey = "categories";
    } else if (type == "tags") {
        var urlAsKey = "tags/?" + paramsTags;
    }
    return urlAsKey; 
}


// Bu fonksiyon parametreleri kullanarak post getirir
async function getPosts() {    
    const postsResponse = await fetch(getUrl("posts"));   // bu adresten son n post alındı. type'ı response
    const postsJson = await postsResponse.json();
    // console.log(postsJson);
    return postsJson;
}


// Bu fonksiyon kategori listesini getirir
async function getCategories() {
    const categoriesResponse = (await fetch(getUrl("categories"))).json();
    // console.log(categoriesResponse);
    return categoriesResponse;
}


// Bu fonksiyon etiket listesini getirir
async function getTags() {    
    const tagsResponse = (await fetch(getUrl("tags"))).json();
    return tagsResponse;
}


function loadPosts() {
    showLoading(loadingIds.post, true);
    showPostList(false);

    if (hasCache(getUrlAsKey("posts"))) {    // data varsa cache'den veriyi alıp ekrana bas
        var posts = localStorage.getItem(getUrlAsKey("posts"));
        posts = JSON.parse(posts);  // string olan veriyi kullanılabilir object array'e dönüştürüyor
        pageBlock.totalPostCount = localStorage.getItem(getUrlAsKey("posts")+"_posts_count");
        showPosts(posts);
    } else {    // data yoksa veriyi çek ekrana bas
        // console.log("İSTEK ATIYOR")
        getPosts().then(res => {
            pageBlock.totalPostCount = res.found;
            setCache(getUrlAsKey("posts")+"_posts_count", res.found);
            setCache(getUrlAsKey("posts"), res.posts);
            showPosts(res.posts);
        }).catch(err => {
            showLoading(loadingIds.post, false);
            showError(err, "danger");
        });
    }
}


function loadCategories() {
/*
    Promise all yapısı, birden fazla promise işleminin hepsinin bittiğini kontrol etmek için kullanılır.
    İşlemler lineer (senkron) değil asenkron yapılır, toplam bekleme süresi max(prmomise) kadar olur.
    Eğer promiselerden biri reject olursa, diğerlerinin durumuna bakılmaksızın catch'e düşer.
    Promise.all yapısı kullanılırken buna dikkat ederek kullanılmalıdır.
*/

    if (hasCache(getUrlAsKey("categories")) && hasCache(getUrlAsKey("tags"))) {
        var categories = localStorage.getItem(getUrlAsKey("categories"));
        categories = JSON.parse(categories);
        var tags = localStorage.getItem(getUrlAsKey("tags"));
        tags = JSON.parse(tags);
        showLoading(loadingIds.category, false);
        showCategories(categories);
        showTags(tags);
    } else {
        Promise.all([getCategories(), getTags()]).then(vals => {
            setCache(getUrlAsKey("tags"), vals[1].tags);
            showTags(vals[1].tags);
            showLoading(loadingIds.category, false);
            setCache(getUrlAsKey("categories"), vals[0].categories);
            showCategories(vals[0].categories);
            showRetryBtn(false);
        }).catch(err => {
            showLoading(loadingIds.category, false);
            showRetryBtn(true);
        });    
    }
}


// ***** UI fonksiyonları
// Bu fonksiyon sayfa yüklendiğinde gerekli listener'ları ekler/dinler
function setListeners() {
    document.getElementById("title").addEventListener("click", () => {
        uiValues.reset();
        pageBlock.reset();
        postRequest.category = "";
        postRequest.tag = "";
        loadPosts();
        loadCategories();
    });
    document.getElementById("retryButton").addEventListener("click", () => {
        showRetryBtn(false);
        showLoading(loadingIds.category, true);
        loadCategories();
    });
    document.addEventListener("keydown", (event) => {
        var previousPage = document.getElementById("previousPage");
        var nextPage = document.getElementById("nextPage");
        const key = event.key;
        if (previousPage != null || nextPage != null) {}
        switch(key) {
            case "ArrowLeft":
                // console.log("left");
                if (previousPage != null) previousPage.click();
                break;
            case "ArrowRight":
                // console.log("right");
                if (nextPage != null) nextPage.click();
                break;
        }
    })
}


function setCache(url, data) {
    var strData = JSON.stringify(data);   // object array'i string'e dönüştürüyor.
    // console.log(strData);
    // console.log(posts);
    // console.log(categories);
    localStorage.setItem(url, strData);
    localStorage.setItem(url + "_lastTime", Date.now());
}


function hasCache(url) {
    var data = localStorage.getItem(url);

    if (data == null) {
        // console.log("data yok");
        return false;
    } else {
        // console.log("data var");
        return isTimeValid(url);
    }
}


function isTimeValid(url) {
    var recordedTime = localStorage.getItem(url + "_lastTime");
    // console.log(recordedTime);
    var timeDifference = Math.floor((Date.now() - recordedTime) / 1000 / 60);
    // console.log(timeDifference);
    if (timeDifference < 3) {
        return true;
    } else {
        return false;
    }
}


// Bu fonksiyon, request sonucunda gelen postları, kategori adını ve kategorideki post sayısını kullanarak arayüzü günceller.
function showPosts(posts) {
    var postList = document.getElementById("postList");
    var html = `<div class="card-header">Kevserin Mutfağı: <b>${uiValues.sourceName} (${uiValues.postCount} yazı)</b></div>`;

    for (let i = 0; i < posts.length; i++) {
        var postsCats = Object.keys(posts[i].categories);
        var postsTags = Object.keys(posts[i].tags);
        var postsExcerpt = truncateStr(posts[i]);
        var postsDate = getDate(posts[i]);

        html += `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <img src="${posts[i].featured_image}" class="card-img mt-2">
                    </div>
                    <div class="col-md-8">
                        <div class="card-body">
                            <h5 class="card-title">${posts[i].title}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">Tarih: ${postsDate}</h6>
                            <p class="card-text">${postsExcerpt}</p>
                            <p class="card-text my-0"><small class="text-muted">Kategori: ${postsCats.join(", ")}</small></p>
                            <p class="card-text my-0"><small class="text-muted">Etiket: ${postsTags.join(", ")}</small></p>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    postList.innerHTML = html;
    showPagesBlock();
    showLoading(loadingIds.post, false);
    showPostList(true);
}


// Bu fonksiyon, request sonucunda gelen kategorileri, sayfadaki select içerisine yerleştirir ve bu select'in değişikliklerini dinler
function showCategories(categories) {
    var categoryList = document.getElementById("category");
    // console.log(categoryList.options);
    var html = `<option value="" selected>${uiValues.categoryName}</option>`;

    for (let i = 0; i < categories.length; i++) {
        html += `<option value="${categories[i].slug}">${categories[i].name}</option>`;
    }
    categoryList.innerHTML = html;
    categoryList.classList.remove("d-none");

    categoryList.addEventListener("change", () => {
        document.getElementById("tag").value = ""
        uiValues.sourceName = categoryList.options[categoryList.selectedIndex].text;
        pageBlock.reset();
        postRequest.category = categoryList.value;
        postRequest.tag = "";
        loadPosts();
    });
}


function showTags(tags) {
    // console.log(tags);
    var tagList = document.getElementById("tag");
    // console.log(tagList);
    var html = `<option value="" selected>${uiValues.tagName}</option>`;

    for (let i = 0; i < tags.length; i++) {
        html += `<option value="${tags[i].slug}">${tags[i].name}</option>`;
    }

    tagList.innerHTML = html;
    tagList.classList.remove("d-none");

    tagList.addEventListener("change", () => {
        // console.log("tag changed");
        document.getElementById("category").value = ""
        uiValues.sourceName = tagList.options[tagList.selectedIndex].text;
        postRequest.tag = tagList.value;
        postRequest.category = "";
        uiValues
        loadPosts();
    })
}


// Bu fonksiyon, çağırıldığında sayfadaki pagination yapısını oluşturur
function showPagesBlock() {
    pageBlock.start = (pageBlock.pagePerBlockCount * pageBlock.activeBlock) + 1;
    pageBlock.end = pageBlock.start + (pageBlock.pagePerBlockCount - 1);
    pageBlock.totalPageCount = Math.ceil(pageBlock.totalPostCount / postRequest.number);    // toplam sayfa sayısı
    pageBlock.totalBlockCount = Math.ceil(pageBlock.totalPageCount / pageBlock.pagePerBlockCount);  // toplam blok sayısı
    // console.log(pageBlock.totalPageCount);
    // console.log(pageBlock.totalBlockCount);
    
    if (pageBlock.blockChange) {
        pageBlock.selected = pageBlock.start;
        pageBlock.blockChange = false;
    }

    if (pageBlock.end > pageBlock.totalPageCount) {
        pageBlock.end = pageBlock.totalPageCount;
        pageBlock.isLastBlock = true;
    }

    var pageNo = document.getElementById("page");
    var html = `<li class="page-item">
                    <a class="page-link" id="previousPage" href="#" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>`;

    if (pageBlock.activeBlock > 0 ) {
        html += `<li class="page-item">
                    <a class="page-link" id="morePrevPages" href="#" role="button">
                    ...
                    </a>
                </li>`;
    }

    for (let i = pageBlock.start; i <= pageBlock.end; i++) {
            let activeClassName = (i == pageBlock.selected) ? "active" : "";
            html += `<li class="page-item ${activeClassName}">
                        <a class="page-link" href="#">${i}</a>
                    </li>`;        
    }

    if (pageBlock.isLastBlock == false) {
        html += `<li class="page-item">
                    <a class="page-link" id="moreNextPages" href="#" role="button">
                    ...
                    </a>
                </li>
                <li class="page-item">
                    <a class="page-link" id="nextPage" href="#" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>`;
    }
    
    pageNo.innerHTML = html;
    setPagination();
}


// Bu fonksiyon, pagination alanındaki butonların clicklerini handle eder
function setPagination() {
    var pageNo = document.getElementById("page");
    var previousPage = document.getElementById("previousPage");
    var nextPage = document.getElementById("nextPage");
    var morePrevPages = document.getElementById("morePrevPages");
    var moreNextPages = document.getElementById("moreNextPages");

    if (nextPage != null) {
        nextPage.addEventListener("click", () => {
            // console.log("Next clicked");
            if (pageBlock.selected < pageBlock.end) {
                pageBlock.selected++;
            } else {
                pageBlock.selected++;
                pageBlock.activeBlock++;
                // console.log("What now?")
            }
            showPagesBlock();
            loadPosts();
        });
    }    

    previousPage.addEventListener("click", () => {
        // console.log("Prev clicked");
        if (pageBlock.selected > pageBlock.start) {
            pageBlock.selected--;
        } else if (pageBlock.activeBlock > 0) {
            pageBlock.selected--;
            pageBlock.activeBlock--;
            // console.log("What now?");
        }
        showPagesBlock();
        loadPosts();
    });

    for (let i = 0; i < pageNo.children.length; i++) {
        // console.log(pageNo.children[i].children[0].text);
        if (isNaN(pageNo.children[i].children[0].text) == false) {
            pageNo.children[i].addEventListener("click", () => {
                pageBlock.selected = pageNo.children[i].children[0].text;
                // console.log(pageBlock.selected);
                showPagesBlock();
                loadPosts();
            })
        }
    }

    if (moreNextPages != null) {
        moreNextPages.addEventListener("click", () => {
            // console.log("More Next Clicked");
            pageBlock.blockChange = true;
            pageBlock.activeBlock++;
            showPagesBlock();
            loadPosts();
        });
    }    

    if (morePrevPages != null) {
        morePrevPages.addEventListener("click", () => {
            // console.log("More Prev Clicked");
            pageBlock.blockChange = true;
            pageBlock.activeBlock--;
            showPagesBlock();
            loadPosts();
        });
    }    
}


// Bu fonksiyon isVisible parametresinin duruma göre post list ile pagination'ı gösterir ya da gizler
function showPostList(isVisible) {
    var postList = document.getElementById("postList");
    var paginationBlock = document.getElementById("pagination");

    if (isVisible) {
        postList.classList.add("d-block");
        paginationBlock.classList.add("d-block");
    } else {
        postList.classList.remove("d-block");
        postList.classList.add("d-none");
        paginationBlock.classList.remove("d-block");
        paginationBlock.classList.add("d-none");
    }
}


// Bu fonksiyon isVisible parametresinin durumuna göre loading ve categoryloading'i gösterir ya da gizler
function showLoading(id, isVisible) {
    var loadImage = document.getElementById(id);

    if (isVisible) {
        loadImage.classList.add("d-block");
    } else {
        loadImage.classList.remove("d-block");
        loadImage.classList.add("d-none");
    }
}


// This function, determines isVisible parameter to show or hide retry button
function showRetryBtn(isVisible) {
    var retryBtn = document.getElementById("retryButton");

    if (isVisible) {
        retryBtn.classList.remove("d-none");
    } else {
        retryBtn.classList.remove("d-block");
        retryBtn.classList.add("d-none");
    }
}


// Bu fonksiyon hata mesajı gösterir, parametrelerine göre ise görünümü değişir
function showError(message, className) {
    var errorMessage = document.getElementById("errorMessage");

    var error_html = `
        <div class="alert alert-${className}">
            ${message}
        </div>`;
        
    errorMessage.innerHTML = error_html;
    errorMessage.classList.add("d-block");
}


// ***** Yardımcı fonksiyonlar

// Bu fonksiyon postRequest objesindeki propertyleri, url'in sonuna eklenebilecek formata çevirir
function getParameters(request) {
    var params = "";
    let keys = Object.keys(request);
    keys.forEach( (key, index) => {
        params += `${key}=${request[key]}`;
        if (index+1 != keys.length) params += "&";
    });
    // console.log(params);
    return params;
}

// Parametre olarak aldığı değişkenin ilk N karakterini gösterir ve N karakterden büyük ise sonuna üç nokta ekler
function truncateStr(post) {
    var excerpt = post.excerpt;
    var truncatedExcerpt = excerpt.substring(0, 250);

    if (excerpt.length >= 250) {
        truncatedExcerpt += "...";
    } else {
        truncatedExcerpt;
    }
    return truncatedExcerpt;
}


// Parametre olarak aldığı post değişkenin içerisindeki tarihi, beklenen formata dönüştürür
function getDate(post) {
    var postsDate = post.date;
    var date = new Date(postsDate);
    var newDate = date.toLocaleDateString("default", {year: `numeric`, month: `short`, day: `numeric`, hour: `numeric`, minute: `numeric`});
    return newDate;
}


// Bu fonksiyon, çağırıldığında seçili olan sayfaya göre offset hesaplar ve döndürür
function getOffset() {
    return (pageBlock.selected - 1) * postRequest.number;
}