const textElement = document.getElementById("dialogue-text");
const choicesElement = document.getElementById("choices");
const speakerName = document.getElementById("speaker-name");
const suspicionMeter = document.getElementById("suspicion-meter");
const suspicionFill = document.getElementById("suspicion-fill");
const suspicionCount = document.getElementById("suspicion-count");
const mainMenuElement = document.getElementById("main-menu");
const chapterSelectMenuElement = document.getElementById("chapter-select-menu");
const settingsMenuElement = document.getElementById("settings-menu");
const pauseScreenElement = document.getElementById("pause-screen");
const musicVolumeInput = document.getElementById("music-volume");
const musicVolumeValue = document.getElementById("music-volume-value");
const effectsVolumeInput = document.getElementById("effects-volume");
const effectsVolumeValue = document.getElementById("effects-volume-value");
const typingVolumeInput = document.getElementById("typing-volume");
const typingVolumeValue = document.getElementById("typing-volume-value");
const phoneSceneElement = document.getElementById("phone-scene");
const daysLaterSceneElement = document.getElementById("days-later-scene");
const homeDisclosureSceneElement = document.getElementById("home-disclosure-scene");
const homeDisclosureText = document.getElementById("home-disclosure-text");
const chapterTwoFrameElement = document.getElementById("chapter-two-frame");
const gameOverScreenElement = document.getElementById("game-over-screen");
const returnToMenuButton = document.getElementById("return-to-menu");
const gameContainerElement = document.querySelector(".game-container");
const dialogueBoxElement = document.querySelector(".dialogue-box");
const backgroundMusic = document.getElementById("background-music");
const rainSound = document.getElementById("rain-sound");
const lieSound = document.getElementById("lie-sound");
const pauseableAudio = [backgroundMusic, rainSound, lieSound];
const musicToggle = document.getElementById("music-toggle");
const characterElement = document.getElementById("character");
const characterImages = ["game1.png", "game2.png", "game3.png"];
let lastCharacterImageIndex = 0;
let characterScale = 1;
let characterDrop = 0;
let typingTimer;
let typingAudioContext;
let typingNoiseBuffer;
let gameAudioStarted = false;
let gamePaused = false;
let audioWasPlayingWhenPaused = [];
let musicVolume = 0.16;
let soundEffectsVolume = 1;
let typingVolume = 1;
let daysLaterTimer;
let homeDisclosureTimer;
let phoneMessageTimers = [];
let fullDialogue = "";
let dialogueTyping = false;
let awaitingCopResponse = null;
let awaitingChoices = false;
let askingAboutPossibleLocation = false;
let askingWhyStationTonight = false;
let askingWhoSheHidingFrom = false;
let askingWhetherMauSharedHomeDetails = false;
let awaitingHomeDisclosure = false;
let homeDisclosureStage = 0;
let awaitingSchoolConfirmation = false;
let suspicionLevel = 0;
let fakeInvestigationStage = 0;
let fakeInvestigationResult = "";
let gameOver = false;
let endingStage = 0;
const usedChoices = new Set();
const lieChoices = new Set([
  "diner",
  "river",
  "schoolLibrary",
  "retrieveEvidence",
  "meetSomeone",
  "getHerBook",
  "schoolStalker",
]);
const highlightedLieChoices = new Set([...lieChoices, "schoolConfirm"]);
const truthChoices = new Set([
  "oldReadingRoom",
  "hideThere",
  "parents",
  "homeYes",
  "schoolDeny",
]);

document.getElementById("start-game").addEventListener("click", () => {
  startChapterOne();
});
document.getElementById("open-chapter-select").addEventListener("click", () => {
  chapterSelectMenuElement.hidden = false;
});
document.getElementById("back-to-main-menu").addEventListener("click", () => {
  chapterSelectMenuElement.hidden = true;
});
document.getElementById("play-chapter-one").addEventListener("click", startChapterOne);
document.getElementById("play-chapter-two").addEventListener("click", launchChapterTwo);
document.getElementById("game-over-return-to-menu").addEventListener("click", returnToMainMenu);
returnToMenuButton.addEventListener("click", returnToMainMenu);
window.addEventListener("message", (event) => {
  if (event.source !== chapterTwoFrameElement.contentWindow || event.origin !== window.location.origin) return;
  if (event.data?.type === "return-to-menu") returnToMainMenu();
  if (event.data?.type === "toggle-pause") togglePause();
});
document.getElementById("open-settings").addEventListener("click", () => {
  settingsMenuElement.hidden = false;
});
document.getElementById("close-settings").addEventListener("click", () => {
  settingsMenuElement.hidden = true;
});
document.getElementById("resume-game").addEventListener("click", resumeGame);
window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;

  event.preventDefault();
  togglePause();
});
musicVolumeInput.addEventListener("input", () => {
  musicVolume = Number(musicVolumeInput.value) / 100;
  backgroundMusic.volume = musicVolume;
  musicVolumeValue.textContent = `${musicVolumeInput.value}%`;
});
effectsVolumeInput.addEventListener("input", () => {
  soundEffectsVolume = Number(effectsVolumeInput.value) / 100;
  rainSound.volume = 0.04 * soundEffectsVolume;
  lieSound.volume = soundEffectsVolume;
  effectsVolumeValue.textContent = `${effectsVolumeInput.value}%`;
});
typingVolumeInput.addEventListener("input", () => {
  typingVolume = Number(typingVolumeInput.value) / 100;
  typingVolumeValue.textContent = `${typingVolumeInput.value}%`;
});

document.getElementById("skip-phone-scene").addEventListener("click", finishPhoneScene);
document.getElementById("continue-to-interview").addEventListener("click", finishPhoneScene);
document.getElementById("continue-from-time-card").addEventListener("click", finishDaysLaterScene);
homeDisclosureSceneElement.addEventListener("click", (event) => {
  if (event.button !== 0) return;
  if (event.target.closest("#chapter-two-trigger")) {
    startChapterTwo();
    return;
  }
  if (homeDisclosureStage !== 1) return;

  homeDisclosureStage = 2;
  homeDisclosureText.classList.add("fade-away");
  homeDisclosureTimer = setTimeout(showAssaultedButton, 650);
});
musicToggle.addEventListener("click", () => {
  if (backgroundMusic.paused) {
    playBackgroundMusic();
    return;
  }

  backgroundMusic.muted = !backgroundMusic.muted;
  musicToggle.textContent = backgroundMusic.muted ? "Unmute music" : "Mute music";
  musicToggle.setAttribute("aria-pressed", String(backgroundMusic.muted));
});

function canPauseGame() {
  if (gamePaused) return true;
  return mainMenuElement.hidden &&
    chapterSelectMenuElement.hidden &&
    settingsMenuElement.hidden &&
    phoneSceneElement.hidden &&
    daysLaterSceneElement.hidden &&
    homeDisclosureSceneElement.hidden &&
    gameOverScreenElement.hidden &&
    (chapterTwoFrameElement.hidden
      ? !gameContainerElement.classList.contains("intro-active")
      : true);
}

function togglePause() {
  if (!canPauseGame()) return;
  if (gamePaused) {
    resumeGame();
    return;
  }

  gamePaused = true;
  audioWasPlayingWhenPaused = pauseableAudio.map((audio) => !audio.paused);
  pauseableAudio.forEach((audio) => audio.pause());
  if (typingAudioContext?.state === "running") {
    typingAudioContext.suspend().catch((error) => {
      console.error("Typing sound could not be paused:", error);
    });
  }
  gameContainerElement.classList.add("paused");
  chapterTwoFrameElement.contentDocument
    ?.querySelector(".game-container")
    ?.classList.add("paused");
  pauseScreenElement.hidden = false;
  document.getElementById("resume-game").focus();
}

function resumeGame() {
  if (!gamePaused) return;
  gamePaused = false;
  gameContainerElement.classList.remove("paused");
  chapterTwoFrameElement.contentDocument
    ?.querySelector(".game-container")
    ?.classList.remove("paused");
  pauseScreenElement.hidden = true;
  pauseableAudio.forEach((audio, index) => {
    if (!audioWasPlayingWhenPaused[index]) return;
    audio.play().catch((error) => {
      console.error("Game audio could not be resumed:", error);
    });
  });
  audioWasPlayingWhenPaused = [];
  if (typingAudioContext?.state === "suspended") {
    typingAudioContext.resume().catch((error) => {
      console.error("Typing sound could not be resumed:", error);
    });
  }
}

function startChapterOne() {
  mainMenuElement.hidden = true;
  chapterSelectMenuElement.hidden = true;
  settingsMenuElement.hidden = true;
  returnToMenuButton.hidden = false;
  startGameAudio();
  startPhoneScene();
}

function launchChapterTwo() {
  mainMenuElement.hidden = true;
  chapterSelectMenuElement.hidden = true;
  settingsMenuElement.hidden = true;
  returnToMenuButton.hidden = true;
  startGameAudio();
  chapterTwoFrameElement.hidden = false;
}

function returnToMainMenu() {
  clearInterval(typingTimer);
  clearTimeout(daysLaterTimer);
  clearTimeout(homeDisclosureTimer);
  phoneMessageTimers.forEach(clearTimeout);
  phoneMessageTimers = [];
  phoneSceneElement.hidden = true;
  daysLaterSceneElement.hidden = true;
  homeDisclosureSceneElement.hidden = true;
  chapterTwoFrameElement.hidden = true;
  gameOverScreenElement.hidden = true;
  returnToMenuButton.hidden = true;
  chapterSelectMenuElement.hidden = true;
  settingsMenuElement.hidden = true;
  mainMenuElement.hidden = false;
  gameContainerElement.classList.remove("interview-ended", "prison-ending");
  gameContainerElement.classList.add("intro-active");
  reset();
  finishDialogue();
}

function startGameAudio() {
  if (gameAudioStarted) return;
  gameAudioStarted = true;
  musicToggle.hidden = false;
  initializeTypingSound();
  playBackgroundMusic();
  playRainSound();
}

function playBackgroundMusic() {
  backgroundMusic.volume = musicVolume;
  backgroundMusic.playbackRate = 0.9;
  backgroundMusic.play()
    .then(() => {
      musicToggle.textContent = backgroundMusic.muted ? "Unmute music" : "Mute music";
      musicToggle.setAttribute("aria-pressed", String(backgroundMusic.muted));
    })
    .catch((error) => {
      console.error("Background music could not be played:", error);
      musicToggle.textContent = "Retry music";
    });
}

function playRainSound() {
  rainSound.volume = 0.04 * soundEffectsVolume;
  rainSound.play().catch((error) => {
    console.error("Rain sound effect could not be played:", error);
  });
}

function playLieSound() {
  lieSound.volume = soundEffectsVolume;
  lieSound.currentTime = 0;
  lieSound.play().catch((error) => {
    console.error("Lie sound effect could not be played:", error);
  });
}

function initializeTypingSound() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    console.warn("Typing sound is unavailable because Web Audio is not supported.");
    return;
  }

  typingAudioContext = new AudioContextConstructor();
  const bufferLength = Math.ceil(typingAudioContext.sampleRate * 0.025);
  typingNoiseBuffer = typingAudioContext.createBuffer(1, bufferLength, typingAudioContext.sampleRate);
  const noise = typingNoiseBuffer.getChannelData(0);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.random() * 2 - 1;
  }

  typingAudioContext.resume().catch((error) => {
    console.error("Typing sound could not be enabled:", error);
  });
}

function playTypingSound() {
  if (
    !typingAudioContext ||
    !typingNoiseBuffer ||
    typingAudioContext.state !== "running" ||
    typingVolume === 0
  ) return;

  const now = typingAudioContext.currentTime;
  const source = typingAudioContext.createBufferSource();
  const filter = typingAudioContext.createBiquadFilter();
  const volume = typingAudioContext.createGain();
  source.buffer = typingNoiseBuffer;
  filter.type = "bandpass";
  filter.frequency.value = 1900 + Math.random() * 500;
  filter.Q.value = 0.8;
  volume.gain.setValueAtTime(0.012 * typingVolume, now);
  volume.gain.exponentialRampToValueAtTime(0.001 * typingVolume, now + 0.025);
  source.connect(filter);
  filter.connect(volume);
  volume.connect(typingAudioContext.destination);
  source.start(now);
  source.stop(now + 0.03);
}

function startPhoneScene() {
  phoneSceneElement.hidden = false;
  const messages = [...phoneSceneElement.querySelectorAll(".phone-message")];
  const typingIndicator = phoneSceneElement.querySelector(".phone-typing");
  const continueButton = document.getElementById("continue-to-interview");

  messages.forEach((message) => {
    message.hidden = true;
    message.classList.remove("message-arrive");
  });
  continueButton.hidden = true;
  phoneMessageTimers = [];

  let nextMessageAt = 0;
  messages.forEach((message) => {
    const isIncoming = message.classList.contains("received");
    const typingDuration = isIncoming ? 850 : 0;
    const messageTime = nextMessageAt + typingDuration;

    if (isIncoming) {
      phoneMessageTimers.push(setTimeout(() => {
        typingIndicator.hidden = false;
      }, nextMessageAt));
    }

    phoneMessageTimers.push(setTimeout(() => {
      typingIndicator.hidden = true;
      message.hidden = false;
      message.classList.add("message-arrive");
      const thread = document.getElementById("phone-thread");
      thread.scrollTop = thread.scrollHeight;
    }, messageTime));

    nextMessageAt = messageTime + (isIncoming ? 1250 : 950);
  });

  phoneMessageTimers.push(setTimeout(() => {
    continueButton.hidden = false;
    typingIndicator.hidden = true;
  }, nextMessageAt + 300));
}

function finishPhoneScene() {
  if (phoneSceneElement.hidden) return;
  phoneMessageTimers.forEach(clearTimeout);
  phoneMessageTimers = [];
  phoneSceneElement.hidden = true;
  startDaysLaterScene();
}

function startDaysLaterScene() {
  daysLaterSceneElement.hidden = false;
  daysLaterTimer = setTimeout(finishDaysLaterScene, 2600);
}

function finishDaysLaterScene() {
  if (daysLaterSceneElement.hidden) return;
  clearTimeout(daysLaterTimer);
  daysLaterSceneElement.hidden = true;
  gameContainerElement.classList.remove("intro-active");
  reset();
}

function startHomeDisclosure() {
  awaitingCopResponse = null;
  awaitingChoices = false;
  awaitingHomeDisclosure = false;
  choicesElement.innerHTML = "";
  gameContainerElement.classList.add("interview-ended");
  homeDisclosureStage = 1;
  homeDisclosureText.textContent = "Her father";
  homeDisclosureText.classList.remove("fade-away");
  homeDisclosureSceneElement.hidden = false;
}

function showAssaultedButton() {
  if (homeDisclosureStage !== 2 || homeDisclosureSceneElement.hidden) return;
  homeDisclosureStage = 3;
  homeDisclosureText.classList.remove("fade-away");
  homeDisclosureText.innerHTML = '<button id="chapter-two-trigger" class="glitch-word" type="button">Isn&apos;is not who you think he is</button>';
}

function startChapterTwo() {
  if (homeDisclosureStage !== 3) return;
  clearTimeout(homeDisclosureTimer);
  homeDisclosureStage = 0;
  homeDisclosureSceneElement.hidden = true;
  launchChapterTwo();
}

function setSpeaker(name) {
  speakerName.textContent = name;
  dialogueBoxElement.classList.toggle("player-speaking", name === "Freya");
}

function renderChoices(choices) {
  const renderedChoices = choices
    .filter(([choice]) => !usedChoices.has(choice))
    .map(([choice, label]) => {
      const isLie = highlightedLieChoices.has(choice);
      const lieAttribute = isLie ? 'data-lie="true"' : "";
      const nonLieAttribute = isLie ? "" : 'data-non-lie="true"';
      const secretRevealAttribute = choice === "homeYes" ? 'data-secret-reveal="true"' : "";
      const lieLabel = isLie ? '<span class="lie-label">LIE</span>' : "";
      const truthLabel = isLie ? "" : '<span class="truth-label">TRUTH</span>';
      return `<button ${lieAttribute} ${nonLieAttribute} ${secretRevealAttribute} onclick="respond('${choice}')">${label}${lieLabel}${truthLabel}</button>`;
    })
    .join("");
  choicesElement.innerHTML = renderedChoices
    ? `<div class="choices-panel">${renderedChoices}</div>`
    : "";
}

function updateSuspicionMeter() {
  const progress = Math.min(suspicionLevel, 3);
  suspicionMeter.setAttribute("aria-valuenow", String(progress));
  suspicionFill.style.width = `${(progress / 3) * 100}%`;
  suspicionCount.textContent = `${progress} / 3`;
  suspicionMeter.classList.toggle("is-high", progress >= 2);
}

function pulseRedScreen() {
  gameContainerElement.classList.remove("lie-pulse");
  void gameContainerElement.offsetWidth;
  gameContainerElement.classList.add("lie-pulse");
}

function cycleCharacterImage() {
  let nextImageIndex = Math.floor(Math.random() * characterImages.length);
  if (nextImageIndex === lastCharacterImageIndex) {
    nextImageIndex = (nextImageIndex + 1 + Math.floor(Math.random() * (characterImages.length - 1))) % characterImages.length;
  }

  lastCharacterImageIndex = nextImageIndex;
  characterElement.src = characterImages[nextImageIndex];
}

function zoomCharacterForLie() {
  characterScale = Math.min(characterScale + 0.12, 1.8);
  characterDrop = Math.min(characterDrop + 18, 108);
  characterElement.style.setProperty("--character-scale", String(characterScale));
  characterElement.style.setProperty("--character-drop", `${characterDrop}px`);
}

function resetCharacterZoom() {
  characterScale = 1;
  characterDrop = 0;
  characterElement.style.removeProperty("--character-scale");
  characterElement.style.removeProperty("--character-drop");
}

function typeText(message) {
  clearInterval(typingTimer);
  fullDialogue = message;
  cycleCharacterImage();
  dialogueTyping = true;
  textElement.textContent = "";
  let i = 0;
  typingTimer = setInterval(() => {
    if (gamePaused) return;
    textElement.textContent += message[i];
    if (i % 3 === 0 && !/\s/.test(message[i])) playTypingSound();
    i++;
    if (i >= message.length) {
      clearInterval(typingTimer);
      dialogueTyping = false;
      showGameOverScreen();
    }
  }, 30);
}

function finishDialogue() {
  clearInterval(typingTimer);
  textElement.textContent = fullDialogue;
  dialogueTyping = false;
  showGameOverScreen();
}

function showGameOverScreen() {
  if (!gameOver || (endingStage !== 4 && fakeInvestigationStage !== 4)) return;
  gameOverScreenElement.hidden = false;
  returnToMenuButton.hidden = true;
}

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.addEventListener("click", (event) => {
  if (
    event.target.closest("button") ||
    !mainMenuElement.hidden ||
    !homeDisclosureSceneElement.hidden ||
    !chapterTwoFrameElement.hidden
  ) return;

  if (dialogueTyping) {
    finishDialogue();
  } else if (awaitingCopResponse) {
    const copResponse = awaitingCopResponse;
    awaitingCopResponse = null;
    awaitingChoices = !gameOver;
    setSpeaker("Officer Riley");
    typeText(copResponse);
  } else if (awaitingChoices) {
    awaitingChoices = false;
    if (awaitingHomeDisclosure) {
      awaitingHomeDisclosure = false;
      startHomeDisclosure();
    } else if (awaitingSchoolConfirmation) {
      awaitingSchoolConfirmation = false;
      showSchoolConfirmationChoices();
    } else if (fakeInvestigationStage > 0) {
      advanceFakeInvestigation();
    } else {
      fakeInvestigationStage = 0;
      fakeInvestigationResult = "";
      showFollowUpChoices();
    }
  } else if (gameOver && endingStage > 0 && endingStage < 4) {
    advanceEnding();
  } else if (gameOver && (endingStage === 4 || fakeInvestigationStage === 4)) {
    showGameOverScreen();
  }
});

function respond(choice) {
  if (gameOver) return;

  let freyaAnswer;
  let copResponse;
  const suspiciousResponse = lieChoices.has(choice) && choice !== "schoolStalker"
    ? raiseSuspicion()
    : null;
  if (highlightedLieChoices.has(choice)) {
    zoomCharacterForLie();
    pulseRedScreen();
    playLieSound();
  }
  if (truthChoices.has(choice)) {
    resetCharacterZoom();
    suspicionLevel = Math.max(0, suspicionLevel - 1);
    updateSuspicionMeter();
  }
  usedChoices.add(choice);

  if (choice === "personality") {
    freyaAnswer = "Mau was quiet around strangers, but fiercely loyal to the people she trusted. She was curious, brave, and usually kept a silver bracelet under her sleeve.";
    copResponse = "That helps. Based on her personality, where might Mau have gone, or which place might have felt safe enough for her to hide?";
    askingAboutPossibleLocation = true;
  } else if (choice === "oldReadingRoom") {
    freyaAnswer = "The old reading room above Blackwood Station. Mau used to hide there when she needed somewhere quiet.";
    copResponse = "That fits what we know. The old reading room is above the platform. Why would Mau go there?";
    askingAboutPossibleLocation = false;
    askingWhyStationTonight = true;
  } else if (choice === "diner") {
    freyaAnswer = "Maybe the diner on South Street... though Mau always said it was too noisy.";
    copResponse = "It is possible, but it does not sound like somewhere she would go to feel safe.";
  } else if (choice === "river") {
    freyaAnswer = "The footbridge by the river, maybe. We used to go there sometimes.";
    copResponse = "I will note it, but the river is exposed. She may have chosen somewhere more private.";
  } else if (choice === "schoolLibrary") {
    freyaAnswer = "Perhaps the school library. She loved books and used to stay there after class.";
    copResponse = "That is worth checking, though it closes early. Think of somewhere she could reach after midnight.";
  } else if (choice === "location") {
    freyaAnswer = "I last saw Mau outside the old Blackwood Station just after midnight. She said she was going inside to find something important.";
    copResponse = "Why would Mau go to the station? Did she tell you what she was looking for?";
    askingWhyStationTonight = true;
  } else if (choice === "retrieveEvidence") {
    freyaAnswer = "She said she found evidence against Mr. Vale hidden in the station archives.";
    copResponse = "That does not fit what you told me.";
  } else if (choice === "hideThere") {
    freyaAnswer = "Mau was frightened. I think she went there because it was quiet and she wanted somewhere safe to hide.";
    copResponse = "Why would Mau need to hide there? And who was she hiding from?";
    askingWhyStationTonight = false;
    askingWhoSheHidingFrom = true;
  } else if (choice === "parents") {
    freyaAnswer = "She was hiding from her parents. Things at home had become frightening, and she didn't know where else to go.";
    copResponse = "I understand. We will handle that carefully. Did she tell you what happened at home?";
    askingWhoSheHidingFrom = false;
    askingWhetherMauSharedHomeDetails = true;
  } else if (choice === "homeYes") {
    freyaAnswer = "Yes. She told me things at home had become frightening.";
    copResponse = "What has been happening at home?";
    askingWhetherMauSharedHomeDetails = false;
    awaitingHomeDisclosure = true;
  } else if (choice === "schoolStalker") {
    freyaAnswer = "I shouldn't say this... but I think it was Eli Mercer. He went to her school, and she said he had been following her.";
    copResponse = "Eli Mercer? Are you sure he was following her?";
    suspicionLevel = 3;
    updateSuspicionMeter();
    awaitingSchoolConfirmation = true;
    askingWhoSheHidingFrom = false;
  } else if (choice === "schoolConfirm") {
    freyaAnswer = "Yes. I'm sure Eli was following her.";
    copResponse = "All right. I'll bring him in and question him.";
    fakeInvestigationResult = "Eli denies following Mau, but his story keeps changing. I think he may be involved.";
    fakeInvestigationStage = 1;
  } else if (choice === "schoolDeny") {
    freyaAnswer = "No. I made that up. I don't know if Eli was following her.";
    copResponse = "Thank you for telling me the truth. Let's focus on what you actually know about Mau.";
    fakeInvestigationStage = 0;
    fakeInvestigationResult = "";
    askingWhoSheHidingFrom = true;
  } else if (choice === "meetSomeone") {
    freyaAnswer = "Maybe she was meeting someone there. She didn't tell me who.";
    copResponse = "That does not fit what you told me.";
  } else if (choice === "getHerBook") {
    freyaAnswer = "Maybe she went back for a book she left there.";
    copResponse = "That does not fit what you told me.";
  } else if (choice === "key") {
    freyaAnswer = "It was an old brass key. Mau kept it under her bracelet. She trusted me with the truth, but I was afraid to tell you.";
    copResponse = "You were right to come forward. The key may lead us to the truth.";
  } else if (choice === "watcher") {
    freyaAnswer = "A man in a dark coat came to the station. Mau called him Mr. Vale, and she looked terrified.";
    copResponse = "Mr. Vale is now a person of interest. Describe anything else you noticed.";
  } else if (choice === "otherCall") {
    freyaAnswer = "I heard Mau shout, 'Vale knows,' then someone pulled the emergency alarm. The next thing I heard was running in the tunnel.";
    copResponse = "An alarm, a tunnel, and Mr. Vale. We have a possible route.";
  } else if (choice === "evidence") {
    freyaAnswer = "I kept Mau's key and remembered that her last message mentioned the station archives.";
    copResponse = "Wait. Combined with everything we know, that key is not just evidence. It may be the next step.";
  } else if (choice === "safePlace") {
    freyaAnswer = "Mau always felt safe in the closed reading room above the station platform. She used to hide there when everything became too much.";
    copResponse = "The reading room is worth checking. Did she ever mention the old key or a way into the archives?";
  } else if (choice === "end") {
    freyaAnswer = "I will help you search the station archives.";
    copResponse = "Wait here while I secure the archives. This may be the breakthrough we've been waiting for.";
  }

  if (suspiciousResponse && choice !== "schoolStalker") copResponse = suspiciousResponse;

  setSpeaker("Freya");
  typeText(freyaAnswer);
  choicesElement.innerHTML = "";
  awaitingCopResponse = copResponse;
  awaitingChoices = false;
}

function raiseSuspicion() {
  suspicionLevel++;
  updateSuspicionMeter();

  if (suspicionLevel === 1) {
    return "That does not fit what you told me. Are you sure, Freya?";
  }
  if (suspicionLevel === 2) {
    return "Your story keeps changing. Is there something you are not telling me?";
  }
  gameOver = true;
  endingStage = 1;
  return "Freya, your answers don't add up. You're under arrest for misleading this investigation.";
}

function advanceFakeInvestigation() {
  if (fakeInvestigationStage === 1) {
    fakeInvestigationStage = 2;
    setSpeaker("Officer Riley");
    typeText(fakeInvestigationResult);
    awaitingChoices = true;
  } else if (fakeInvestigationStage === 2) {
    fakeInvestigationStage = 3;
    gameOver = true;
    setSpeaker("Officer Riley");
    typeText("He's not telling me everything. I'm placing him under arrest until we can get answers.");
    awaitingChoices = true;
  } else if (fakeInvestigationStage === 3) {
    fakeInvestigationStage = 4;
    document.querySelector(".game-container").classList.add("prison-ending");
    setSpeaker("Narrator");
    typeText("The student is taken into custody. Later, the evidence clears him—but the damage is done. Mau is never found, and the case remains unsolved.");
    awaitingChoices = false;
  }
}

function advanceEnding() {
  if (endingStage === 1) {
    endingStage = 2;
    setSpeaker("Freya");
    typeText("Please, Officer Riley, I was scared. I was only trying to help Mau. Please don't arrest me!");
  } else if (endingStage === 2) {
    endingStage = 3;
    setSpeaker("Officer Riley");
    typeText("I'm sorry, Freya. You misled the investigation. You're under arrest.");
  } else if (endingStage === 3) {
    endingStage = 4;
    document.querySelector(".game-container").classList.add("prison-ending");
    setSpeaker("Narrator");
    typeText("Later that night, Freya sits alone in a cold prison cell, still wondering if she made the right choice in keeping maus secret.");
  }
}

function reset() {
  clearTimeout(homeDisclosureTimer);
  resetCharacterZoom();
  gameContainerElement.classList.remove("interview-ended");
  gameOverScreenElement.hidden = true;
  usedChoices.clear();
  awaitingCopResponse = null;
  awaitingChoices = false;
  askingAboutPossibleLocation = false;
  askingWhyStationTonight = false;
  askingWhoSheHidingFrom = false;
  askingWhetherMauSharedHomeDetails = false;
  awaitingHomeDisclosure = false;
  homeDisclosureStage = 0;
  homeDisclosureSceneElement.hidden = true;
  chapterTwoFrameElement.hidden = true;
  awaitingSchoolConfirmation = false;
  suspicionLevel = 0;
  fakeInvestigationStage = 0;
  fakeInvestigationResult = "";
  gameOver = false;
  endingStage = 0;
  updateSuspicionMeter();
  setSpeaker("Officer Riley");
  typeText("Hello. I'm Officer Riley. I need to ask you a few questions about your missing friend Mau. What was Mau like, and where did you last see her?");
  showOpeningChoices();
}

function showOpeningChoices() {
  const openingChoices = [
    ["personality", "Describe Mau's personality"],
    ["location", "Tell him where Mau was last seen"],
  ];

  renderChoices(openingChoices);
}

function showSchoolConfirmationChoices() {
  renderChoices([
    ["schoolConfirm", "Yes. I’m sure he followed her."],
    ["schoolDeny", "No. I made it up."],
  ]);
}

function showFollowUpChoices() {
  const followUpChoices = askingWhetherMauSharedHomeDetails
    ? [
        ["homeYes", "Yes, she told me what was happening"],
      ]
    : askingWhoSheHidingFrom
    ? [
        ["parents", "She was hiding from her parents"],
        ["schoolStalker", "Someone from school was following her"],
      ]
    : askingWhyStationTonight
    ? [
      ["hideThere", "She was scared and wanted somewhere safe to hide"],
      ["retrieveEvidence", "She went to retrieve evidence against Mr. Vale"],
      ["meetSomeone", "She was meeting someone in secret"],
      ["getHerBook", "She went back to get a book"],
      ]
    : askingAboutPossibleLocation
    ? [
        ["oldReadingRoom", "The old reading room above the station"],
        ["diner", "The diner on South Street"],
        ["river", "The footbridge by the river"],
        ["schoolLibrary", "The school library"],
      ]
    : [
        ["key", "Mau gave me a key"],
        ["watcher", "I saw a man following her"],
        ["otherCall", "I heard Mau near the tunnel"],
        ["evidence", "I should tell you more"],
        ["safePlace", "She might have gone somewhere safe"],
        ["end", "I want to search the station archives"],
      ];

  renderChoices(followUpChoices);
}
