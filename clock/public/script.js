(function () {
  async function activateScreenLock() {
    let wakeLock = null;

    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (error) {
      console.error("Wake lock is not supported", error);
    }

    return wakeLock;
  }

  function releaseScreenLock(wakeLock) {
    if (wakeLock) {
      wakeLock.release();
    }
  }

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function vibrate(pattern = [50]) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.error("Vibration is not supported", error);
    }
  }

  const offCanvasMenu = new bootstrap.Offcanvas(document.getElementById("offcanvasMenu"));
  const modalSettingsElem = document.getElementById("modalSettings");
  const modalSettings = new bootstrap.Modal(modalSettingsElem);

  const clockWrapper = document.querySelector(".clock-wrapper-inner");
  const clockTime = document.getElementById("time-display");
  const clockTimeSmall = document.getElementById("time-display-small");

  const btnPlay = document.querySelector("#btn-control-play");
  const btnStop = document.getElementById("btn-control-stop");
  const btnFullScreen = document.getElementById("btn-fullscreen");
  const btnSettings = document.getElementById("btn-settings");

  function updateTitle(title, hash) {
    document.title = title;
    if (hash) {
      const _url = encodeURIComponent(hash.toLowerCase().replace(" ", "-"));
      history.replaceState(undefined, undefined, `#${_url}`);
    } else {
      history.replaceState(
        "",
        document.title,
        window.location.pathname + window.location.search
      );
    }
    document.querySelectorAll(".clock-tool-title").forEach((e) => (e.innerText = title));
  }

  document.querySelectorAll(".btn-vibrate").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pattern = btn.dataset.vibratePattern;
      vibrate(pattern ? pattern.split(" ").map((s) => parseInt(s)) : [50]);
    });
  });

  const tools = {
    clock: {
      title: "Clock",
      timer: null,
      timeFormat: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        day: "numeric",
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      }),
      init: function () {
        this.tick();
        updateTitle(this.title);
        clockWrapper.classList.add("clock-hands-visible");

        this.timer = setInterval(this.tick.bind(this), 1000);
      },
      tick: function () {
        const ticks = new Date();
        const [weekDay, date, time] = this.timeFormat.format(ticks).split(", ");
        clockTime.innerText = time;
        clockTimeSmall.innerText = `${date} (${weekDay})`;

        if (ticks.getSeconds() === 0) {
          clockWrapper.classList.add("border-pulse");
        } else if (ticks.getSeconds() === 1) {
          clockWrapper.classList.remove("border-pulse");
        }
      },
      remove: function () {
        clearInterval(this.timer);
        clockWrapper.classList.remove("clock-hands-visible", "border-pulse");
      },
    },
    chronometer: {
      title: "Chronometer",
      url: "chronometer",
      elapsed: 0,
      timer: null,
      init: function () {
        this.tick();
        updateTitle(this.title, this.url);
        btnPlay.classList.remove("control-playing");
        clockWrapper.classList.remove("border-active");
      },
      tick: function () {
        const ticks = this.elapsed;
        const _subStart = ticks < 60 * 60 * 1000 ? 14 : 11;
        [clockTime.innerText, clockTimeSmall.innerText] = new Date(ticks)
          .toISOString()
          .substring(_subStart, 23)
          .split(".");
      },
      play: function () {
        const _start = Date.now() - this.elapsed;
        this.timer = setInterval(() => {
          this.elapsed = Date.now() - _start;
          this.tick();
        }, 1);
        activateScreenLock();
        btnPlay.classList.add("control-playing");
        clockWrapper.classList.add("border-active");
      },
      pause: function () {
        clearInterval(this.timer);
        releaseScreenLock();
        btnPlay.classList.remove("control-playing");
        clockWrapper.classList.remove("border-active");
      },
      stop: function () {
        clearInterval(this.timer);
        this.elapsed = 0;
        this.tick();
        btnPlay.classList.remove("control-playing");
        clockWrapper.classList.remove("border-active");
        releaseScreenLock();
      },
      settings: function (data) {
        console.log(data);
      },
      remove: function () {
        this.stop();
      },
    },
  };

  let activeTool;
  function toolChange(fn) {
    if (activeTool) {
      activeTool.remove();
    }
    activeTool = fn;
    fn.init();

    if (fn.settings) {
      btnSettings.classList.remove("d-none");
    } else {
      btnSettings.classList.add("d-none");
    }

    if (fn.play || fn.pause) {
      btnPlay.classList.remove("d-none");
    } else {
      btnPlay.classList.add("d-none");
    }

    if (fn.stop) {
      btnStop.classList.remove("d-none");
    } else {
      btnStop.classList.add("d-none");
    }
  }

  btnPlay.addEventListener("click", () => {
    btnPlay.classList.contains("control-playing")
      ? activeTool.pause()
      : activeTool.play();
  });
  btnStop.addEventListener("click", () => {
    activeTool.stop();
  });

  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    btnFullScreen.style.display = "none";
  } else {
    btnFullScreen.addEventListener("click", () => {
      toggleFullScreen();
    });
  }

  modalSettingsElem.addEventListener("show.bs.modal", () => {
    const activeTab = document.getElementById(`settings-${activeTool.url}`);
    if (activeTab) {
      document.querySelectorAll(".settings-tab").forEach((e) => {
        e.classList.remove("show", "active");
      });
      activeTab.classList.add("show", "active");
    }
  });
  modalSettingsElem.addEventListener("hide.bs.modal", () => {
    const form = document.querySelector(".settings-tab.show.active form");
    activeTool.settings(new FormData(form));
  });

  const _hashChange = () => {
    modalSettings.hide();

    const _hash = window.location.hash.substring(1);
    const _fnName = _hash in tools ? _hash : "clock";
    toolChange(tools[_fnName]);

    document.querySelectorAll("#nav-pills .nav-link").forEach((e) => {
      e.classList.remove("active");
      e.ariaSelected = false;
    });
    const _activePill = document.querySelector(
      `#nav-pills .nav-link[href="#${_fnName}"]`
    );
    _activePill.classList.add("active");
    _activePill.ariaSelected = true;

    offCanvasMenu.hide();
  };
  window.addEventListener("hashchange", _hashChange);
  _hashChange();
})();
