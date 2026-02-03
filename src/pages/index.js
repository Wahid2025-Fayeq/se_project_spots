import Api from "../util/Api.js";
import "../pages/index.css";
import {
  validationConfig,
  disableButton,
  enableValidation,
} from "../scripts/validation";

// --------- HELPER FOR "Saving..." / "Deleting..." ---------
function renderLoading(isLoading, button, defaultText, loadingText) {
  if (!button) return;
  button.textContent = isLoading ? loadingText : defaultText;
}

// --------- GLOBAL STATE ---------
let currentUserId = null;
let selectedCard = null;
let selectedCardId = null;

// --------- API INSTANCE ---------
const api = new Api({
  baseUrl: "https://around-api.en.tripleten-services.com/v1",
  headers: {
    authorization: "cf143ddc-e5b7-44f2-b563-374f81cfb9fa",
    "Content-Type": "application/json",
  },
});

// --------- DOM ELEMENTS ---------

// Profile modal
const editProfileButton = document.querySelector(".profile__edit-button");
const editProfileModal = document.querySelector("#edit-profile-modal");
const editProfileCloseButton = editProfileModal.querySelector(
  ".modal__close-button",
);
const editProfileForm = editProfileModal.querySelector(".modal__form");
const editProfileNameInput = editProfileModal.querySelector(
  "#profile-name-input",
);
const editProfileDescriptionInput = editProfileModal.querySelector(
  "#profile-description-input",
);
const editProfileSubmitButton = editProfileForm.querySelector(
  ".modal__submit-button",
);

// New post (card) modal
const newPostModal = document.querySelector("#new-post-modal");
const addCardFormEl = newPostModal.querySelector(".modal__form");
const newPostCaptionInput = newPostModal.querySelector("#card-caption-input");
const newPostImageInput = newPostModal.querySelector("#card-image-input");
const newPostButton = document.querySelector(".profile__add-button");
const cardSubmitButton = addCardFormEl.querySelector(".modal__submit-button");
const newPostCloseButton = newPostModal.querySelector(".modal__close-button");

// Avatar edit
const avatarEditButton = document.querySelector(".profile__avatar-button");

// Preview modal
const previewModal = document.querySelector("#preview-modal");
const previewCloseBtn = previewModal.querySelector(".modal__close-button");
const previewImageEl = previewModal.querySelector(".modal__image");
const previewNameEl = previewModal.querySelector(".modal__caption");

// Profile text + avatar on page
const profileNameEl = document.querySelector(".profile__name");
const profileDescriptionEl = document.querySelector(".profile__description");
const profileAvatarEl = document.querySelector(".profile__avatar");

// Delete confirmation popup
const deleteModal = document.querySelector("#delete-card-modal");
const deleteForm = deleteModal
  ? deleteModal.querySelector(".modal__form")
  : null;
const deleteSubmitButton = deleteForm
  ? deleteForm.querySelector(".modal__submit-button")
  : null;
const deleteCloseButton = deleteModal
  ? deleteModal.querySelector(".modal__close-button")
  : null;
const cancelDeleteButton = document.querySelector("#delete-cancel-button");

// Avatar modal
const avatarModal = document.querySelector("#avatar-modal");
const avatarForm = avatarModal
  ? avatarModal.querySelector(".modal__form")
  : null;
const avatarInput = avatarForm
  ? avatarForm.querySelector("#avatar-link-input")
  : null;
const avatarSubmitButton = avatarForm
  ? avatarForm.querySelector(".modal__submit-button")
  : null;
const avatarCloseButton = avatarModal
  ? avatarModal.querySelector(".modal__close-button")
  : null;

// Cards
const cardTemplate = document.querySelector("#card-template");
const cardsList = document.querySelector(".cards__list");

// --------- MODAL HELPERS ---------

function handleEscape(evt) {
  if (evt.key === "Escape") {
    const openedModal = document.querySelector(".modal_is-opened");
    if (openedModal) {
      closeModal(openedModal);
    }
  }
}

function handleOverlayClose(evt) {
  if (evt.target.classList.contains("modal")) {
    closeModal(evt.target);
  }
}

function openModal(modal) {
  modal.classList.add("modal_is-opened");
  modal.addEventListener("mousedown", handleOverlayClose);
  document.addEventListener("keydown", handleEscape);
}

function closeModal(modal) {
  modal.classList.remove("modal_is-opened");
  modal.removeEventListener("mousedown", handleOverlayClose);
  document.removeEventListener("keydown", handleEscape);
}

// --------- CARD HELPERS ---------

// For this API, isLiked is a boolean on the card object
function isCardLiked(card) {
  return Boolean(card.isLiked);
}

function handleDeleteCard(cardElement, data) {
  selectedCard = cardElement;
  selectedCardId = data._id;
  openModal(deleteModal);
}

function getCardElement(data) {
  const cardElement = cardTemplate.content
    .querySelector(".card")
    .cloneNode(true);

  const cardTitleEl = cardElement.querySelector(".card__title");
  const cardImageEl = cardElement.querySelector(".card__image");
  const likeButtonEl = cardElement.querySelector(".card__link-button");
  const deleteButtonEl = cardElement.querySelector(".card__delete-button");

  cardImageEl.src = data.link;
  cardImageEl.alt = data.name;
  cardTitleEl.textContent = data.name;

  // Owner may be an ID string or an object, handle both defensively
  const ownerId =
    data.owner && typeof data.owner === "object" ? data.owner._id : data.owner;

  if (ownerId && currentUserId && ownerId !== currentUserId) {
    deleteButtonEl.style.display = "none";
  }

  if (isCardLiked(data)) {
    likeButtonEl.classList.add("card__link-button_active");
  }

  likeButtonEl.addEventListener("click", () => {
    const shouldLike = !likeButtonEl.classList.contains(
      "card__link-button_active",
    );

    api
      .changeLikeCardStatus(data._id, shouldLike)
      .then((updatedCard) => {
        if (updatedCard.isLiked) {
          likeButtonEl.classList.add("card__link-button_active");
        } else {
          likeButtonEl.classList.remove("card__link-button_active");
        }
      })
      .catch(console.error);
  });

  deleteButtonEl.addEventListener("click", () => {
    handleDeleteCard(cardElement, data);
  });

  cardImageEl.addEventListener("click", () => {
    previewImageEl.src = data.link;
    previewNameEl.textContent = data.name;
    previewImageEl.alt = data.name;
    openModal(previewModal);
  });

  return cardElement;
}

function addCardToStart(cardData) {
  const cardElement = getCardElement(cardData);
  cardsList.prepend(cardElement);
}

function addCardToEnd(cardData) {
  const cardElement = getCardElement(cardData);
  cardsList.append(cardElement);
}

// --------- FORM HANDLERS ---------

// Edit profile
editProfileForm.addEventListener("submit", (evt) => {
  evt.preventDefault();

  const name = editProfileNameInput.value;
  const about = editProfileDescriptionInput.value;

  renderLoading(true, editProfileSubmitButton, "Save", "Saving...");

  api
    .setUpdateUserInfo({ name, about })
    .then((userData) => {
      profileNameEl.textContent = userData.name;
      profileDescriptionEl.textContent = userData.about;
      closeModal(editProfileModal);
    })
    .catch(console.error)
    .finally(() => {
      renderLoading(false, editProfileSubmitButton, "Save", "Saving...");
    });
});

// Add new card
addCardFormEl.addEventListener("submit", (evt) => {
  evt.preventDefault();

  const name = newPostCaptionInput.value;
  const link = newPostImageInput.value;

  renderLoading(true, cardSubmitButton, "Save", "Saving...");

  api
    .addCard({ name, link })
    .then((newCard) => {
      addCardToStart(newCard);
      addCardFormEl.reset();
      disableButton(cardSubmitButton, validationConfig);
      closeModal(newPostModal);
    })
    .catch(console.error)
    .finally(() => {
      renderLoading(false, cardSubmitButton, "Save", "Saving...");
    });
});

// Update avatar
if (avatarForm && avatarInput && avatarSubmitButton) {
  avatarForm.addEventListener("submit", (evt) => {
    evt.preventDefault();

    const avatarUrl = avatarInput.value;

    renderLoading(true, avatarSubmitButton, "Save", "Saving...");

    api
      .updateAvatar(avatarUrl)
      .then((userData) => {
        profileAvatarEl.src = userData.avatar;
        avatarForm.reset();
        disableButton(avatarSubmitButton, validationConfig);
        closeModal(avatarModal);
      })
      .catch(console.error)
      .finally(() => {
        renderLoading(false, avatarSubmitButton, "Save", "Saving...");
      });
  });
}

// Delete card (confirm)
if (deleteForm && deleteSubmitButton) {
  deleteForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    if (!selectedCardId) return;

    renderLoading(true, deleteSubmitButton, "Yes, delete", "Deleting...");

    api
      .deleteCard(selectedCardId)
      .then(() => {
        if (selectedCard) {
          selectedCard.remove();
        }
        selectedCard = null;
        selectedCardId = null;
        closeModal(deleteModal);
      })
      .catch(console.error)
      .finally(() => {
        renderLoading(false, deleteSubmitButton, "Yes, delete", "Deleting...");
      });
  });
}

// --------- BUTTON / MODAL OPEN & CLOSE LISTENERS ---------

// Open profile edit
editProfileButton.addEventListener("click", () => {
  editProfileNameInput.value = profileNameEl.textContent;
  editProfileDescriptionInput.value = profileDescriptionEl.textContent;
  openModal(editProfileModal);
});

// Close profile edit
editProfileCloseButton.addEventListener("click", () => {
  closeModal(editProfileModal);
});

// Open new post
newPostButton.addEventListener("click", () => {
  openModal(newPostModal);
});

// Close new post
newPostCloseButton.addEventListener("click", () => {
  closeModal(newPostModal);
});

// Open avatar modal from avatar button
if (avatarEditButton && avatarModal && avatarForm && avatarSubmitButton) {
  avatarEditButton.addEventListener("click", () => {
    openModal(avatarModal);
  });
}

// Close avatar modal
if (avatarCloseButton) {
  avatarCloseButton.addEventListener("click", () => {
    closeModal(avatarModal);
  });
}

// Close delete modal from X button
if (deleteCloseButton) {
  deleteCloseButton.addEventListener("click", () => {
    closeModal(deleteModal);
  });
}

// Close delete modal from Cancel button
if (cancelDeleteButton) {
  cancelDeleteButton.addEventListener("click", () => {
    closeModal(deleteModal);
  });
}

// Close image preview
previewCloseBtn.addEventListener("click", () => {
  closeModal(previewModal);
});

// --------- INITIAL DATA LOAD ---------

api
  .getAppInfo()
  .then(([userData, initialCards]) => {
    currentUserId = userData._id;

    profileNameEl.textContent = userData.name;
    profileDescriptionEl.textContent = userData.about;
    profileAvatarEl.src = userData.avatar;

    initialCards.forEach((card) => {
      addCardToEnd(card);
    });
  })
  .catch(console.error);

// --------- ENABLE FORM VALIDATION ---------
enableValidation(validationConfig);
