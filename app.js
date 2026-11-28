(function () {
  const base = document.body.dataset.base || "./";
  const only = document.body.dataset.client || "";
  // iOS Safari only keeps a handful of video decoders alive at once.
  // This page can have ~25 <video> tags, so attach src only for nearby cards.
  const MAX_ATTACHED = 3;

  function asset(path) {
    return base + path.replace(/^\//, "");
  }

  function preferredFormat() {
    return window.matchMedia("(max-width: 700px)").matches ? "vertical" : "widescreen";
  }

  const attached = [];

  function release(video) {
    if (!video || !video.getAttribute("data-attached")) return;
    try { video.pause(); } catch (e) {}
    const t = video.currentTime || 0;
    if (t > 0.1) video.setAttribute("data-time", String(t));
    // Do not set video.src = "" — that resolves to the page URL.
    // removeAttribute + load() is what actually releases the iOS decoder.
    video.removeAttribute("src");
    video.preload = "none";
    video.removeAttribute("data-attached");
    try { video.load(); } catch (e) {}
    const i = attached.indexOf(video);
    if (i >= 0) attached.splice(i, 1);
  }

  function evictFor(keep) {
    for (let i = attached.length - 1; i >= 0; i--) {
      if (!attached[i] || !attached[i].isConnected) attached.splice(i, 1);
    }
    while (attached.length >= MAX_ATTACHED) {
      let victim = null;
      for (let i = 0; i < attached.length; i++) {
        const v = attached[i];
        if (v === keep) continue;
        if (!v.paused && !v.ended) continue;
        victim = v;
        break;
      }
      if (!victim) {
        for (let i = 0; i < attached.length; i++) {
          if (attached[i] !== keep) { victim = attached[i]; break; }
        }
      }
      if (!victim) break;
      release(victim);
    }
  }

  function attach(video, src) {
    if (!video || !src) return;
    if (video.getAttribute("data-attached") === src) return;
    evictFor(video);
    video.preload = "auto";
    video.src = src;
    video.setAttribute("data-attached", src);
    const t = parseFloat(video.getAttribute("data-time") || "0");
    if (t > 0.1) {
      const onMeta = function () {
        video.removeEventListener("loadedmetadata", onMeta);
        try { video.currentTime = t; } catch (e) {}
      };
      video.addEventListener("loadedmetadata", onMeta);
    }
    if (attached.indexOf(video) < 0) attached.push(video);
  }

  function renderVideo(v) {
    const fmt0 = preferredFormat();
    const card = document.createElement("article");
    card.className = "video-card";
    card.id = v.id;
    if (v.variation) card.classList.add("variation");

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
    video.setAttribute("webkit-playsinline", "");
    video.preload = "none";
    player.append(video);

    let currentSrc = "";
    let nearView = false;

    function setFormat(fmt) {
      const f = v.formats[fmt] || v.formats.widescreen || v.formats.vertical;
      const playing = !video.paused && !video.ended && !!video.getAttribute("data-attached");
      const t = video.currentTime || 0;
      if (t > 0.1) video.setAttribute("data-time", String(t));
      currentSrc = asset(f.src);
      video.poster = asset(f.poster);
      player.classList.toggle("widescreen", fmt === "widescreen");
      player.classList.toggle("vertical", fmt === "vertical");
      wideBtn.setAttribute("aria-pressed", fmt === "widescreen" ? "true" : "false");
      vertBtn.setAttribute("aria-pressed", fmt === "vertical" ? "true" : "false");
      if (nearView || playing) {
        attach(video, currentSrc);
        if (playing) video.play().catch(function () {});
      }
    }

    function ensureReadyAndPlay() {
      attach(video, currentSrc);
      const playAttempt = video.play();
      if (playAttempt && playAttempt.catch) playAttempt.catch(function () {});
    }

    // Attach in the same gesture as a tap so iOS will allow playback.
    function onActivate() {
      attach(video, currentSrc);
    }
    player.addEventListener("pointerdown", onActivate, true);
    player.addEventListener("touchstart", onActivate, { capture: true, passive: true });
    video.addEventListener("click", function () {
      if (video.getAttribute("data-attached") !== currentSrc) {
        ensureReadyAndPlay();
      }
    });

    wideBtn.disabled = !v.formats.widescreen;
    vertBtn.disabled = !v.formats.vertical;
    if (!v.formats.widescreen || !v.formats.vertical) toggle.style.display = "none";
    wideBtn.addEventListener("click", function () { setFormat("widescreen"); });
    vertBtn.addEventListener("click", function () { setFormat("vertical"); });

    if (v.variation) {
      const tag = document.createElement("p");
      tag.className = "variation-tag";
      tag.textContent = "Variation";
      card.append(h2, tag, desc, meta, player);
    } else {
      card.append(h2, desc, meta, player);
    }
    setFormat(v.formats[fmt0] ? fmt0 : Object.keys(v.formats)[0]);

    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          nearView = entry.isIntersecting;
          if (entry.isIntersecting) {
            attach(video, currentSrc);
          } else if (video.paused || video.ended) {
            release(video);
          }
        });
      }, { root: null, rootMargin: "300px 0px", threshold: 0.01 });
      io.observe(card);
    } else {
      nearView = true;
      attach(video, currentSrc);
    }

    return card;
  }

  function renderClientPage(client) {
    const mount = document.getElementById("videos");
    const videos = client.videos || [];
    const featured = videos.filter(function (v) { return v.featured; });
    const rest = videos.filter(function (v) { return !v.featured; });
    if (featured.length) {
      const sec = document.createElement("section");
      sec.className = "featured-section";
      sec.setAttribute("aria-label", "Featured");
      const h = document.createElement("h2");
      h.className = "section-title";
      h.textContent = "Featured";
      sec.append(h);
      featured.forEach(function (v) {
        const card = renderVideo(v);
        card.classList.add("featured");
        sec.append(card);
      });
      mount.append(sec);
    }
    rest.forEach(function (v) { mount.append(renderVideo(v)); });
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
