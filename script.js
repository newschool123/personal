const textElement = document.getElementById("dialogue-text");
const choicesElement = document.getElementById("choices");
const speakerName = document.getElementById("speaker-name");
const suspicionMeter = document.getElementById("suspicion-meter");
const suspicionFill = document.getElementById("suspicion-fill");
const suspicionCount = document.getElementById("suspicion-count");
const mainMenuElement = document.getElementById("main-menu");
const phoneSceneElement = document.getElementById("phone-scene");
const daysLaterSceneElement = document.getElementById("days-later-scene");
const homeDisclosureSceneElement = document.getElementById("home-disclosure-scene");
const homeDisclosureText = document.getElementById("home-disclosure-text");
const chapterTwoSceneElement = document.getElementById("chapter-two-scene");
const gameContainerElement = document.querySelector(".game-container");
const backgroundMusic = document.getElementById("background-music");
const musicToggle = document.getElementById("music-toggle");
let typingTimer;
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
  mainMenuElement.hidden = true;
  musicToggle.hidden = false;
  playBackgroundMusic();
  startPhoneScene();
});

document.getElementById("skip-phone-scene").addEventListener("click", finishPhoneScene);
document.getElementById("continue-to-interview").addEventListener("click", finishPhoneScene);
document.getElementById("continue-from-time-card").addEventListener("click", finishDaysLaterScene);
document.getElementById("continue-chapter-two").addEventListener("click", finishChapterTwo);
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

function playBackgroundMusic() {
  backgroundMusic.volume = 0.16;
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
  homeDisclosureStage = 1;
  homeDisclosureText.textContent = "Her father";
  homeDisclosureText.classList.remove("fade-away");
  homeDisclosureSceneElement.hidden = false;
}

function showAssaultedButton() {
  if (homeDisclosureStage !== 2 || homeDisclosureSceneElement.hidden) return;
  homeDisclosureStage = 3;
  homeDisclosureText.classList.remove("fade-away");
  homeDisclosureText.innerHTML = '<button id="chapter-two-trigger" class="glitch-word" type="button">Hits her</button>';
}

function startChapterTwo() {
  if (homeDisclosureStage !== 3) return;
  clearTimeout(homeDisclosureTimer);
  homeDisclosureStage = 0;
  homeDisclosureSceneElement.hidden = true;
  chapterTwoSceneElement.hidden = false;
}

function finishChapterTwo() {
  chapterTwoSceneElement.hidden = true;
  setSpeaker("Freya");
  typeText("I couldn't keep Mau's secret anymore. I have to help the officer find her.");
  awaitingChoices = true;
}

function setSpeaker(name) {
  speakerName.textContent = name;
}

function renderChoices(choices) {
  choicesElement.innerHTML = choices
    .filter(([choice]) => !usedChoices.has(choice))
    .map(([choice, label]) => {
      const isLie = highlightedLieChoices.has(choice);
      const lieAttribute = isLie ? 'data-lie="true"' : "";
      const secretRevealAttribute = choice === "homeYes" ? 'data-secret-reveal="true"' : "";
      const lieLabel = isLie ? '<span class="lie-label">LIE</span>' : "";
      return `<button ${lieAttribute} ${secretRevealAttribute} onclick="respond('${choice}')">${label}${lieLabel}</button>`;
    })
    .join("");
}

function updateSuspicionMeter() {
  const progress = Math.min(suspicionLevel, 3);
  suspicionMeter.setAttribute("aria-valuenow", String(progress));
  suspicionFill.style.width = `${(progress / 3) * 100}%`;
  suspicionCount.textContent = `${progress} / 3`;
  suspicionMeter.classList.toggle("is-high", progress >= 2);
}

function typeText(message) {
  clearInterval(typingTimer);
  fullDialogue = message;
  dialogueTyping = true;
  textElement.textContent = "";
  let i = 0;
  typingTimer = setInterval(() => {
    textElement.textContent += message[i];
    i++;
    if (i >= message.length) {
      clearInterval(typingTimer);
      dialogueTyping = false;
    }
  }, 30);
}

function finishDialogue() {
  clearInterval(typingTimer);
  textElement.textContent = fullDialogue;
  dialogueTyping = false;
}

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.addEventListener("click", (event) => {
  if (
    event.target.closest("button") ||
    !mainMenuElement.hidden ||
    !homeDisclosureSceneElement.hidden ||
    !chapterTwoSceneElement.hidden
  ) return;

  if (dialogueTyping) {
    finishDialogue();
  } else if (awaitingCopResponse) {
    const copResponse = awaitingCopResponse;
    awaitingCopResponse = null;
    awaitingChoices = !gameOver;
    setSpeaker("Daddy Cop");
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
  }
});

function respond(choice) {
  if (gameOver) return;

  let freyaAnswer;
  let copResponse;
  const suspiciousResponse = lieChoices.has(choice) && choice !== "schoolStalker"
    ? raiseSuspicion()
    : null;
  if (truthChoices.has(choice)) {
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
  } else if (choice === "cantTell") {
    freyaAnswer = "I can't tell you.";
    copResponse = "All right. I won't force you to answer, but I need you to know it could affect where we look for her.";
    askingWhoSheHidingFrom = false;
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
    setSpeaker("Daddy Cop");
    typeText(fakeInvestigationResult);
    awaitingChoices = true;
  } else if (fakeInvestigationStage === 2) {
    fakeInvestigationStage = 3;
    gameOver = true;
    setSpeaker("Daddy Cop");
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
    typeText("Please, Officer Daddy Cop, I was scared. I was only trying to help Mau. Please don't arrest me!");
  } else if (endingStage === 2) {
    endingStage = 3;
    setSpeaker("Daddy Cop");
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
  chapterTwoSceneElement.hidden = true;
  awaitingSchoolConfirmation = false;
  suspicionLevel = 0;
  fakeInvestigationStage = 0;
  fakeInvestigationResult = "";
  gameOver = false;
  endingStage = 0;
  updateSuspicionMeter();
  setSpeaker("Daddy Cop");
  typeText("Hello. I'm Officer Daddy Cop. I need to ask you a few questions about your missing friend Mau. What was Mau like, and where did you last see her?");
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
        ["cantTell", "I can't tell you"],
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
