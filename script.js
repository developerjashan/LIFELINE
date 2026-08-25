const sensorState = {
  temperature: 30.4,
  humidity: 63,
  pitch: -6,
  roll: 5,
  yaw: 172,
  power: 92,
  oxygen: 88,
  water: 82,
  communication: 95,
  stabilization: 90,
  camera: 68,
  robotHealth: 92,
};

const sensorHistory = {
  temperature: Array(24).fill(sensorState.temperature),
  humidity: Array(24).fill(sensorState.humidity),
  pitch: Array(24).fill(sensorState.pitch),
  roll: Array(24).fill(sensorState.roll),
  yaw: Array(24).fill(sensorState.yaw),
};

const chartRefs = {
  temperature: document.getElementById("temperatureChart"),
  humidity: document.getElementById("humidityChart"),
  orientation: document.getElementById("orientationChart"),
};

const missionLog = document.getElementById("eventList");
const preloader = document.getElementById("preloader");
const preloaderBar = document.getElementById("preloaderBar");
const preloaderValue = document.getElementById("preloaderValue");
const currentYear = document.getElementById("currentYear");
const scrollTopButton = document.getElementById("scrollTop");
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("siteNav");

const componentTitle = document.getElementById("componentTitle");
const componentDescription = document.getElementById("componentDescription");
const componentButtons = [...document.querySelectorAll(".component-item")];
const diagramParts = [...document.querySelectorAll(".diagram-part")];
const diagramTooltip = document.getElementById("diagramTooltip");
const diagramStage = document.getElementById("diagramStage");

const liveVideo = document.getElementById("liveVideo");
const videoFallback = document.getElementById("videoFallback");
const videoTimestamp = document.getElementById("videoTimestamp");
const videoSource = document.getElementById("videoSource");
const signalQuality = document.getElementById("signalQuality");

const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".site-nav a")];

const chartThemes = {
  temperature: {
    stroke: "#ff7a00",
    fill: "rgba(255, 122, 0, 0.18)",
    min: 25,
    max: 40,
  },
  humidity: {
    stroke: "#00d4ff",
    fill: "rgba(0, 212, 255, 0.18)",
    min: 40,
    max: 90,
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomWalk(current, min, max, step) {
  return clamp(current + randomBetween(-step, step), min, max);
}

function levelClass(level) {
  if (level === "WARNING") return "state-warning";
  if (level === "CRITICAL") return "state-critical";
  return "";
}

function setStatusTag(id, level) {
  const tag = document.getElementById(id);
  if (!tag) return;
  tag.textContent = level;
  tag.className = `status-tag ${levelClass(level)}`.trim();
}

function updateGauge(id, percent) {
  const gauge = document.getElementById(id);
  if (gauge) {
    gauge.style.setProperty("--progress", percent.toFixed(1));
  }
}

function updateBar(id, percent) {
  const bar = document.getElementById(id);
  if (!bar) return;
  bar.style.width = `${percent}%`;
  bar.style.filter = percent < 45 ? "saturate(1.3)" : "none";
}

function metricStatus(metric, value) {
  switch (metric) {
    case "temperature":
      if (value >= 37) return "CRITICAL";
      if (value >= 33.5) return "WARNING";
      return "NORMAL";
    case "humidity":
      if (value >= 84 || value <= 43) return "CRITICAL";
      if (value >= 74 || value <= 48) return "WARNING";
      return "NORMAL";
    case "pitch":
    case "roll": {
      const tilt = Math.abs(value);
      if (tilt >= 34) return "CRITICAL";
      if (tilt >= 22) return "WARNING";
      return "NORMAL";
    }
    case "yaw": {
      const deviation = Math.abs(180 - value);
      if (deviation >= 130) return "CRITICAL";
      if (deviation >= 75) return "WARNING";
      return "NORMAL";
    }
    default:
      return "NORMAL";
  }
}

function updateTelemetry() {
  sensorState.temperature = randomWalk(sensorState.temperature, 25, 40, 1.6);
  sensorState.humidity = randomWalk(sensorState.humidity, 40, 90, 4.4);
  sensorState.pitch = randomWalk(sensorState.pitch, -45, 45, 8);
  sensorState.roll = randomWalk(sensorState.roll, -45, 45, 8);
  sensorState.yaw = (sensorState.yaw + randomBetween(-22, 22) + 360) % 360;

  sensorState.power = randomWalk(sensorState.power, 68, 100, 1.2);
  sensorState.oxygen = randomWalk(sensorState.oxygen, 56, 100, 1.6);
  sensorState.water = randomWalk(sensorState.water, 44, 100, 2);
  sensorState.communication = randomWalk(sensorState.communication, 58, 100, 2.8);
  sensorState.camera = randomWalk(sensorState.camera, 58, 100, 2.5);
  sensorState.stabilization = clamp(
    100 - Math.max(Math.abs(sensorState.pitch), Math.abs(sensorState.roll)) * 1.45 + randomBetween(-4, 4),
    45,
    100
  );

  const levels = {
    temperature: metricStatus("temperature", sensorState.temperature),
    humidity: metricStatus("humidity", sensorState.humidity),
    pitch: metricStatus("pitch", sensorState.pitch),
    roll: metricStatus("roll", sensorState.roll),
    yaw: metricStatus("yaw", sensorState.yaw),
  };

  const severityScore = Object.values(levels).reduce((score, level) => {
    if (level === "CRITICAL") return score + 2;
    if (level === "WARNING") return score + 1;
    return score;
  }, 0);

  const overallLevel = severityScore >= 4 ? "CRITICAL" : severityScore >= 1 ? "WARNING" : "NORMAL";
  const overallMessage =
    overallLevel === "CRITICAL"
      ? "Critical alignment drift detected. Immediate operator correction advised."
      : overallLevel === "WARNING"
        ? "Subsystem variance rising. Active monitoring recommended."
        : "All critical rescue subsystems are stable.";

  sensorState.robotHealth = clamp(
    100 -
      severityScore * 12 -
      (100 - sensorState.communication) * 0.2 -
      (100 - sensorState.stabilization) * 0.25,
    40,
    99
  );

  updateSensorCards(levels, overallLevel, overallMessage);
  updateStatusPanel();
  updateCharts();
  updateMissionLog(overallLevel, levels);
  updateVideoTimestamp();
}

function updateSensorCards(levels, overallLevel, overallMessage) {
  document.getElementById("temperatureValue").textContent = `${sensorState.temperature.toFixed(1)}°C`;
  document.getElementById("humidityValue").textContent = `${Math.round(sensorState.humidity)}%`;
  document.getElementById("pitchValue").textContent = `${Math.round(sensorState.pitch)}°`;
  document.getElementById("rollValue").textContent = `${Math.round(sensorState.roll)}°`;
  document.getElementById("yawValue").textContent = `${Math.round(sensorState.yaw)}°`;

  setStatusTag("temperatureState", levels.temperature);
  setStatusTag("humidityState", levels.humidity);
  setStatusTag("pitchState", levels.pitch);
  setStatusTag("rollState", levels.roll);
  setStatusTag("yawState", levels.yaw);
  setStatusTag("robotState", overallLevel);

  updateGauge("temperatureGauge", ((sensorState.temperature - 25) / 15) * 100);
  updateGauge("humidityGauge", ((sensorState.humidity - 40) / 50) * 100);
  updateGauge("pitchGauge", ((sensorState.pitch + 45) / 90) * 100);
  updateGauge("rollGauge", ((sensorState.roll + 45) / 90) * 100);
  updateGauge("yawGauge", (sensorState.yaw / 360) * 100);

  document.getElementById("robotCondition").textContent =
    overallLevel === "CRITICAL" ? "INTERVENTION REQUIRED" : overallLevel === "WARNING" ? "ACTIVE CORRECTION" : "DEPLOYED";
  document.getElementById("robotNarrative").textContent = overallMessage;
  document.getElementById("robotHealth").textContent = `${Math.round(sensorState.robotHealth)}%`;

  const statusRing = document.getElementById("robotStatusRing");
  statusRing.style.setProperty("--progress", sensorState.robotHealth.toFixed(1));
  statusRing.style.background =
    overallLevel === "CRITICAL"
      ? `conic-gradient(${getComputedStyle(document.documentElement).getPropertyValue("--red")} ${sensorState.robotHealth}%, rgba(255,255,255,0.06) 0)`
      : overallLevel === "WARNING"
        ? `conic-gradient(${getComputedStyle(document.documentElement).getPropertyValue("--orange")} ${sensorState.robotHealth}%, rgba(255,255,255,0.06) 0)`
        : `conic-gradient(${getComputedStyle(document.documentElement).getPropertyValue("--cyan")} ${sensorState.robotHealth}%, rgba(255,255,255,0.06) 0)`;
}

function resourceLabel(value, mode = "percent") {
  if (mode === "camera") return value >= 80 ? "STREAMING" : value >= 62 ? "STANDBY" : "LOW VIS";
  if (mode === "communication") return value >= 82 ? "SECURE" : value >= 66 ? "WARNING" : "UNSTABLE";
  if (mode === "stabilization") return value >= 82 ? "LOCKED" : value >= 64 ? "ADJUSTING" : "SLIP RISK";
  return `${Math.round(value)}%`;
}

function updateStatusPanel() {
  updateBar("powerBar", sensorState.power);
  updateBar("cameraBar", sensorState.camera);
  updateBar("oxygenBar", sensorState.oxygen);
  updateBar("waterBar", sensorState.water);
  updateBar("communicationBar", sensorState.communication);
  updateBar("stabilizationBar", sensorState.stabilization);

  document.getElementById("powerLabel").textContent = resourceLabel(sensorState.power);
  document.getElementById("cameraLabel").textContent = resourceLabel(sensorState.camera, "camera");
  document.getElementById("oxygenLabel").textContent = resourceLabel(sensorState.oxygen);
  document.getElementById("waterLabel").textContent = resourceLabel(sensorState.water);
  document.getElementById("communicationLabel").textContent = resourceLabel(sensorState.communication, "communication");
  document.getElementById("stabilizationLabel").textContent = resourceLabel(sensorState.stabilization, "stabilization");

  const quality = Math.round((sensorState.communication + sensorState.camera) / 2);
  signalQuality.textContent = `Signal ${quality}%`;
}

function pushHistory(key, value) {
  sensorHistory[key].push(value);
  if (sensorHistory[key].length > 24) {
    sensorHistory[key].shift();
  }
}

function updateCharts() {
  pushHistory("temperature", sensorState.temperature);
  pushHistory("humidity", sensorState.humidity);
  pushHistory("pitch", sensorState.pitch);
  pushHistory("roll", sensorState.roll);
  pushHistory("yaw", sensorState.yaw);

  drawSingleSeriesChart(chartRefs.temperature, sensorHistory.temperature, chartThemes.temperature);
  drawSingleSeriesChart(chartRefs.humidity, sensorHistory.humidity, chartThemes.humidity);
  drawOrientationChart(chartRefs.orientation);
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawGrid(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = 20 + ((height - 40) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }

  for (let i = 0; i <= 5; i += 1) {
    const x = 20 + ((width - 40) / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, height - 20);
    ctx.stroke();
  }
}

function drawLine(ctx, width, height, points, color, min, max, fillStyle) {
  const left = 20;
  const bottom = height - 20;
  const chartWidth = width - 40;
  const chartHeight = height - 40;

  const coordinates = points.map((value, index) => {
    const x = left + (chartWidth / Math.max(points.length - 1, 1)) * index;
    const normalized = (value - min) / (max - min);
    const y = bottom - normalized * chartHeight;
    return { x, y };
  });

  if (fillStyle) {
    ctx.beginPath();
    ctx.moveTo(coordinates[0].x, bottom);
    coordinates.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.lineTo(coordinates[coordinates.length - 1].x, bottom);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  ctx.beginPath();
  coordinates.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.stroke();
}

function drawSingleSeriesChart(canvas, points, theme) {
  const { ctx, width, height } = setupCanvas(canvas);
  drawGrid(ctx, width, height);
  drawLine(ctx, width, height, points, theme.stroke, theme.min, theme.max, theme.fill);
}

function drawOrientationChart(canvas) {
  const { ctx, width, height } = setupCanvas(canvas);
  drawGrid(ctx, width, height);

  drawLine(ctx, width, height, sensorHistory.pitch, "#e63946", -45, 45, null);
  drawLine(ctx, width, height, sensorHistory.roll, "#ff7a00", -45, 45, null);
  drawLine(ctx, width, height, sensorHistory.yaw, "#00d4ff", 0, 360, null);
}

function addMissionLogEntry(text) {
  const entry = document.createElement("li");
  const time = document.createElement("small");
  const message = document.createElement("span");
  const now = new Date();

  message.textContent = text;
  time.textContent = now.toLocaleTimeString("en-US", { hour12: false });

  entry.append(message, time);
  missionLog.prepend(entry);

  while (missionLog.children.length > 4) {
    missionLog.removeChild(missionLog.lastElementChild);
  }
}

let missionTick = 0;

function updateMissionLog(overallLevel, levels) {
  missionTick += 1;

  if (missionTick % 4 !== 0) return;

  if (overallLevel === "CRITICAL") {
    addMissionLogEntry("Critical movement variance detected. Stabilization correction required.");
    return;
  }

  if (overallLevel === "WARNING") {
    addMissionLogEntry("Sensor thresholds nearing caution band. Monitoring response intensified.");
    return;
  }

  if (levels.temperature === "NORMAL" && levels.humidity === "NORMAL") {
    addMissionLogEntry("Environmental conditions remain within stable operating limits.");
  } else {
    addMissionLogEntry("Telemetry refreshed. Rescue platform remains under active observation.");
  }
}

function updateVideoTimestamp() {
  const now = new Date();
  videoTimestamp.textContent = now.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function initVideoFeed() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    videoSource.textContent = "Source: simulated visual feed";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });

    liveVideo.srcObject = stream;
    videoFallback.classList.add("is-hidden");
    liveVideo.classList.add("is-visible");
    videoSource.textContent = "Source: webcam live feed";
    document.getElementById("cameraLabel").textContent = "STREAMING";
    sensorState.camera = 96;
    updateBar("cameraBar", sensorState.camera);
  } catch (error) {
    videoSource.textContent = "Source: simulated visual feed";
    document.getElementById("cameraLabel").textContent = "SIMULATED";
    sensorState.camera = 68;
    updateBar("cameraBar", sensorState.camera);
  }
}

function activateComponent(target, event) {
  const matchingPart = diagramParts.find((part) => part.dataset.target === target);
  if (!matchingPart) return;

  diagramParts.forEach((part) => {
    part.classList.toggle("is-active", part.dataset.target === target);
  });

  componentButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.target === target);
  });

  componentTitle.textContent = matchingPart.dataset.title;
  componentDescription.textContent = matchingPart.dataset.description;

  if (event) {
    const bounds = diagramStage.getBoundingClientRect();
    diagramTooltip.innerHTML = `<strong>${matchingPart.dataset.title}</strong><br>${matchingPart.dataset.description}`;
    diagramTooltip.style.left = `${event.clientX - bounds.left + 18}px`;
    diagramTooltip.style.top = `${event.clientY - bounds.top + 18}px`;
    diagramTooltip.classList.add("is-visible");
  }
}

function hideTooltip() {
  diagramTooltip.classList.remove("is-visible");
}

function initDiagram() {
  diagramParts.forEach((part) => {
    part.addEventListener("mouseenter", (event) => activateComponent(part.dataset.target, event));
    part.addEventListener("mousemove", (event) => activateComponent(part.dataset.target, event));
    part.addEventListener("mouseleave", hideTooltip);
  });

  componentButtons.forEach((button) => {
    button.addEventListener("mouseenter", () => activateComponent(button.dataset.target));
    button.addEventListener("focus", () => activateComponent(button.dataset.target));
  });
}

function initReveals() {
  const revealItems = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function initNavigation() {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    navMenu.classList.toggle("is-open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

function initScrollTop() {
  window.addEventListener("scroll", () => {
    scrollTopButton.classList.toggle("is-visible", window.scrollY > 500);
  });

  scrollTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function initPreloader() {
  let value = 0;
  const interval = setInterval(() => {
    value = Math.min(100, value + randomBetween(8, 20));
    preloaderBar.style.width = `${value}%`;
    preloaderValue.textContent = `${Math.round(value)}%`;

    if (value >= 100) {
      clearInterval(interval);
      setTimeout(() => preloader.classList.add("is-hidden"), 320);
    }
  }, 90);
}

function handleResize() {
  updateCharts();
}

window.addEventListener("resize", handleResize);

function initializePage() {
  currentYear.textContent = new Date().getFullYear();
  initPreloader();
  initDiagram();
  initReveals();
  initNavigation();
  initScrollTop();
  initVideoFeed();
  updateVideoTimestamp();
  updateTelemetry();
  setInterval(updateTelemetry, 1000);
}

initializePage();
