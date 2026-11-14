(function () {
  const base = document.body.dataset.base || "./";
  const only = document.body.dataset.client || "";

  function asset(path) {
    return base + path.replace(/^\//, "");
  }

  function preferredFormat() {
    return window.matchMedia("(max-width: 700px)").matches ? "vertical" : "widescreen";
  }

  function renderVideo(v) {
    const fmt0 = preferredFormat();
    const card = document.createElement("article");
    card.className = "video-card";
    card.id = v.id;

    const h2 = document.createElement("h2");
    h2.textContent = v.title;
    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = v.description;

    const meta = document.createElement("div");
    meta.className = "meta";
    const toggle = document.createElement("div");
    toggle.className = "toggle";
    toggle.setAttribute("role", "group");
    toggle.setAttribute("aria-label", "Video format");

    const wideBtn = document.createElement("button");
    wideBtn.type = "button";
    wideBtn.textContent = "Widescreen";
    const vertBtn = document.createElement("button");
    vertBtn.type = "button";
    vertBtn.textContent = "Vertical";

    const dur = document.createElement("span");
    dur.className = "dur";
    dur.textContent = v.duration ? v.duration + "s" : "";

    toggle.append(wideBtn, vertBtn);
    meta.append(toggle, dur);

    const player = document.createElement("div");
    player.className = "player";
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "metadata";
    player.append(video);

    function setFormat(fmt) {
      const f = v.formats[fmt] || v.formats.widescreen || v.formats.vertical;
      const playing = !video.paused && !video.ended;
      const t = video.currentTime || 0;
      video.poster = asset(f.poster);
      video.src = asset(f.src);
      if (t > 0.1) video.currentTime = t;
      if (playing) video.play().catch(function () {});
      player.classList.toggle("widescreen", fmt === "widescreen");
      player.classList.toggle("vertical", fmt === "vertical");
      wideBtn.setAttribute("aria-pressed", fmt === "widescreen" ? "true" : "false");
      vertBtn.setAttribute("aria-pressed", fmt === "vertical" ? "true" : "false");
    }

    wideBtn.disabled = !v.formats.widescreen;
    vertBtn.disabled = !v.formats.vertical;
    if (!v.formats.widescreen || !v.formats.vertical) toggle.style.display = "none";
    wideBtn.addEventListener("click", function () { setFormat("widescreen"); });
    vertBtn.addEventListener("click", function () { setFormat("vertical"); });

    card.append(h2, desc, meta, player);
    setFormat(v.formats[fmt0] ? fmt0 : Object.keys(v.formats)[0]);
    return card;
  }

  function renderClientPage(client) {
    const mount = document.getElementById("videos");
    client.videos.forEach(function (v) { mount.append(renderVideo(v)); });
  }

  function renderIndex(data) {
    const mount = document.getElementById("clients");
    data.clients.forEach(function (c) {
      const a = document.createElement("a");
      a.className = "client-card";
      a.href = asset(c.slug + "/");
      const h2 = document.createElement("h2");
      h2.textContent = c.name;
      const p = document.createElement("p");
      const n = (c.videos || []).length;
      p.textContent = n + (n === 1 ? " video" : " videos");
      a.append(h2, p);
      mount.append(a);
    });
  }

  fetch(asset("videos.json") + "?v=" + Date.now(), {cache: "no-store"})
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (only) {
        const client = data.clients.find(function (c) { return c.id === only; });
        if (!client) { document.getElementById("videos").textContent = "Not found."; return; }
        renderClientPage(client);
      } else {
        renderIndex(data);
      }
    })
    .catch(function (err) {
      const el = document.getElementById("videos") || document.getElementById("clients");
      if (el) el.textContent = "Could not load videos.";
      console.error(err);
    });
})();
