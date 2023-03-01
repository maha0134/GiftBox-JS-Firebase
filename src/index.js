import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
//import for authentication
import {
  getAuth,
  GithubAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCmOhYGnXG8YgYuBic1RxfAt7vNLxMGPnA",
  authDomain: "fire-giftr-39adc.firebaseapp.com",
  projectId: "fire-giftr-39adc",
  storageBucket: "fire-giftr-39adc.appspot.com",
  messagingSenderId: "259061896471",
  appId: "1:259061896471:web:0b92a98a3461b569cdd352",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// get a reference to the database
const db = getFirestore(app);

//setting up authentication
const auth = getAuth(app);
const provider = new GithubAuthProvider();

provider.setCustomParameters({
  allow_signup: "true",
});

//global variables
let months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

let selectedPersonId;
let loggedIn;

document.addEventListener("DOMContentLoaded", addListeners);

function addListeners() {
  //Cancel Buttons
  document
    .getElementById("btnCancelPerson")
    .addEventListener("click", hideOverlay);
  document
    .getElementById("btnCancelIdea")
    .addEventListener("click", hideOverlay);

  //Add Buttons
  document.getElementById("btnAddPerson").addEventListener("click", (ev) => {
    if (loggedIn) {
      showOverlay(ev);
    }
  });

  document.getElementById("btnAddIdea").addEventListener("click", (ev) => {
    if (document.querySelector("ul.person-list .person.active") && loggedIn) {
      showOverlay(ev);
    }
  });

  //Save Buttons
  document.getElementById("btnSaveIdea").addEventListener("click", saveIdea);
  document
    .getElementById("btnSavePerson")
    .addEventListener("click", savePerson);

  //Click on items
  document.querySelector("ul.person-list").addEventListener("click", (ev) => {
    if (ev.target.closest("i")) {
      showOverlay(ev);
    } else {
      personClicked(ev);
    }
  });

  document.querySelector("ul.idea-list").addEventListener("click", (ev) => {
    if (ev.target.closest("i")) showOverlay(ev);
  });

  //cancel buttons on dialogues
  document.getElementById("btnCancelDelete").addEventListener("click", () => {
    document.querySelector(".delete").classList.remove("delete");
    hideOverlay();
  });
  //Confirm buttons on dialogues
  document.getElementById("btnConfirmDelete").addEventListener("click", () => {
    if (document.querySelector("ul.idea-list .delete")) {
      deleteGift();
    } else {
      deletePerson();
    }
  });
  //Login and logout buttons
  document.getElementById("authLogin").addEventListener("click", attemptLogin);
  document.getElementById("authLogout").addEventListener("click", logout);
}

function hideOverlay() {
  document.querySelector(".overlay").classList.remove("active");
  const editPerson = document.querySelector(".editPerson");
  //clear all forms
  document.getElementById("name").value = "";
  document.getElementById("month").value = "1";
  document.getElementById("day").value = "1";
  document.getElementById("title").value = "";
  document.getElementById("location").value = "";

  if (editPerson) {
    document.querySelector(".ref").classList.remove("ref");
    editPerson.classList.remove("editPerson");
  }
  const editIdea = document.querySelector(".editIdea");
  if (editIdea) {
    document.querySelector(".ref").classList.remove("ref");
    editIdea.classList.remove("editIdea");
  }

  document
    .querySelectorAll(".overlay dialog")
    .forEach((dialog) => dialog.classList.remove("active"));
}

function showOverlay(ev) {
  document.querySelector(".overlay").classList.add("active");
  let targetElement = ev.target;
  let id = targetElement.id;
  if (id === "btnAddPerson") id = "dlgPerson";
  if (id === "btnAddIdea") id = "dlgIdea";
  if (id === "btnDelete") {
    id = "dlgDelete";
    targetElement.closest("li").classList.add("delete");
  }
  if (id === "btnEditPerson") {
    const li = targetElement.closest("li");
    li.classList.add("editPerson");
    editPersonDialog(li);
    id = "dlgPerson";
  }
  if (id === "btnEditIdea") {
    const li = targetElement.closest("li");
    li.classList.add("editIdea");
    editIdeaDialog(li);
    id = "dlgIdea";
  }

  document.getElementById(id).classList.add("active");
}

async function getPeople(querySnapshot) {
  const people = []; //to hold all the people from the collection
  // const querySnapshot = await getDocs(collection(db, "people"));
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const id = doc.id;
    people.push({ id, ...data });
  });
  if (people.length > 0) {
    buildPeople(people);
    //highlights first person
    // getIdeas(people[0].id);
    addOnSnapShotGifts(people[0].id);
  } else {
    const ul = document.querySelector("ul.person-list");
    ul.innerHTML = "";
    ul.innerHTML = `<p class="empty">Oops! Looks like there are no people added</p>`;
  }
}

async function buildPeople(people) {
  //build the HTML
  let ul = document.querySelector("ul.person-list");
  let index = 0;
  //replace the old ul contents with the new
  ul.innerHTML = "";
  const ownerID = await getUser(true);
  ul.innerHTML = people
    .map((person) => {
      const dob = `${months[person["birth-month"] - 1]} ${person["birth-day"]}`;
      if (index == 0) {
        index += 1;
        selectedPersonId = person.id;
        return `<li data-id="${person.id}" data-owner=${ownerID.id} class="person active">
                <span class="content"><p class="name">${person.name}</p>
                <p class="dob">${dob}</p></span>
                <span class="icons">
                <i class="material-icons-outlined"id="btnEditPerson">edit</i>
                <i class="material-icons-outlined" id="btnDelete">delete</i></span>
              </li>`;
      }
      return `<li data-id="${person.id}" data-owner=${ownerID.id} class="person">
                <span class="content"><p class="name">${person.name}</p>
                <p class="dob">${dob}</p></span>
                <span class="icons">
                <i class="material-icons-outlined"id="btnEditPerson">edit</i>
                <i class="material-icons-outlined" id="btnDelete">delete</i></span>
              </li>`;
    })
    .join("");
}

function personClicked(ev) {
  const clickedPerson = ev.target.closest("li");
  if (clickedPerson) {
    const activePerson = document.querySelector(".person.active");
    if (activePerson) {
      activePerson.classList.remove("active");
    }
    clickedPerson.classList.add("active");
    const id = clickedPerson.dataset.id;
    selectedPersonId = id;
    // getIdeas(id);
    addOnSnapShotGifts(id);
  }
}

async function getIdeas(querySnapshot) {
  const gifts = []; //to hold the giftIdeas

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const id = doc.id;
    gifts.push({ id, ...data });
  });
  buildIdeas(gifts);
}

function buildIdeas(gifts) {
  let ul = document.querySelector("ul.idea-list");
  ul.innerHTML = "";
  if (gifts.length > 0) {
    ul.innerHTML = gifts
      .map((gift) => {
        if (gift.bought) {
          return `<li class="idea bought" data-id = ${gift.id}><label for="chk-${gift.id}"><input type="checkbox" id="chk-${gift.id}" checked /> Bought</label>
        <p class="title">${gift.idea}</p>
        <p class="location">${gift.location}</p>
        <i class="material-icons-outlined"id="btnEditIdea">edit</i>
        <i class="material-icons-outlined" id="btnDelete">delete</i>
        </li>`;
        }
        return `<li class="idea" data-id = ${gift.id}><label for="chk-${gift.id}"><input type="checkbox" id="chk-${gift.id}" /> Bought</label>
      <p class="title">${gift.idea}</p>
      <p class="location">${gift.location}</p>
      <i class="material-icons-outlined"id="btnEditIdea">edit</i>
      <i class="material-icons-outlined" id="btnDelete">delete</i>
      </li>`;
      })
      .join("");
    document.querySelector(".idea");
  } else {
    ul.innerHTML = `<p class="empty">Oops! Looks like there are no gifts added for the selected person</p>`;
  }
  addBoughtListener();
}

async function savePerson() {
  //function called when user clicks save button from person dialog
  let name = document.getElementById("name").value;
  let month = document.getElementById("month").value;
  let day = document.getElementById("day").value;
  if (!name || !month || !day) return; //form needs more info
  const userRef = await getUser();
  const person = {
    name,
    "birth-month": month,
    "birth-day": day,
    owner: userRef,
  };
  try {
    let docRef;
    const ref = document.querySelector(".ref");
    if (ref) {
      const personId = ref.dataset.id;
      const documentRef = doc(db, "people", personId);
      await setDoc(documentRef, person);
      person.id = personId;
      tellUser(`<p>Person "${name}" edited.</p>`);
    } else {
      docRef = await addDoc(collection(db, "people"), person);
      tellUser(`<p>Person "${name}" added to database.</p>`);
      person.id = docRef.id;
    }
    //1. clear the form fields
    document.getElementById("name").value = "";
    document.getElementById("month").value = "";
    document.getElementById("day").value = "";
    //2. hide the dialog and the overlay
    hideOverlay();
    showPerson(person);
  } catch (err) {
    console.error("Error adding document: ", err);
    //do you want to stay on the dialog?
    //display a mesage to the user about the problem
  }
}

function tellUser(info) {
  const confirmationScreen = document.querySelector(".confirm");
  confirmationScreen.classList.add("onscreen");
  confirmationScreen.innerHTML = info;
  setTimeout(() => {
    confirmationScreen.classList.remove("onscreen");
    confirmationScreen.innerHTML = "";
  }, 2000);
}

function showPerson(person) {
  let li = document.querySelector(`.people [data-id="${person.id}"]`);
  const dob = `${months[person["birth-month"] - 1]} ${person["birth-day"]}`;
  const liData = `<li data-id="${person.id}"
            class="${
              selectedPersonId === person.id ? "person active" : "person"
            }">
            <span class="content"><p class="name">${person.name}</p>
            <p class="dob">${dob}</p></span>
            <span class="icons">
            <i class="material-icons-outlined" id="btnEditPerson">edit</i>
            <i class="material-icons-outlined" id="btnDelete">delete</i>
            </span>
          </li>`;
  if (li) {
    //update on screen
    li.outerHTML = liData;
  } else {
    //add to screen
    const ul = document.querySelector("ul.person-list");
    if (ul.firstElementChild.tagName === "P") {
      ul.innerHTML = liData;
      document.querySelector(".person").classList.add("active");
      buildIdeas([]);
    } else {
      ul.innerHTML += liData;
    }
  }
}

async function saveIdea() {
  //function called when user clicks save button from person dialog
  let title = document.getElementById("title").value;
  let location = document.getElementById("location").value;
  if (!title || !location) return; //form needs more info
  //find the selected person and get ID
  const selectedPerson = document.querySelector(".person.active");
  const personId = selectedPerson.dataset.id;

  //get the reference of the selected person from DB
  const personRef = doc(collection(db, "people"), personId);
  //create the object to be pushed in the DB
  const giftIdea = {
    idea: title,
    location,
    "person-id": personRef,
  };

  try {
    let docRef;
    const ref = document.querySelector(".ref");
    if (ref) {
      const giftId = ref.dataset.id;
      const boughtCheckbox = document.querySelector(
        `.idea input[id=chk-${giftId}]`
      );
      giftIdea.bought = boughtCheckbox.checked;
      const documentRef = doc(db, "gift-ideas", giftId);
      await setDoc(documentRef, giftIdea);
      giftIdea.id = giftId;
      tellUser(`<p>Gift Idea "${title}" edited.</p>`);
    } else {
      docRef = await addDoc(collection(db, "gift-ideas"), giftIdea);
      tellUser(`<p>Gift Idea "${title}" added to database.</p>`);
      giftIdea.id = docRef.id;
      giftIdea.bought = false;
    }

    //1. clear the form fields
    document.getElementById("title").value = "";
    document.getElementById("location").value = "";
    hideOverlay();
    showGift(giftIdea);
  } catch (err) {
    console.error("Error adding document: ", err);
    //do you want to stay on the dialog?
    //display a mesage to the user about the problem
  }
}

function showGift(giftIdea) {
  const liData = `<li data-id="${giftIdea.id}" class="idea">
                    <label for="chk-${giftIdea.id}">
                    <input type="checkbox" 
                    id="chk-${giftIdea.id}" 
                    ${giftIdea.bought ? "checked" : ""}/>
                    Bought</label>
                    <p class="title">${giftIdea.idea}</p>
                    <p class="location">${giftIdea.location}</p>
                    <i class="material-icons-outlined"id="btnEditIdea">edit</i>
                    <i class="material-icons-outlined" id="btnDelete">delete</i></li>`;
  const li = document.querySelector(`.ideas [data-id="${giftIdea.id}"]`);
  if (li) {
    //update the gift Idea
    li.outerHTML = liData;
  } else {
    //add the gift on screen
    const ul = document.querySelector("ul.idea-list");
    //
    if (ul.firstElementChild.tagName === "P") {
      ul.innerHTML = liData;
    } else {
      ul.innerHTML += liData;
    }
  }
  addBoughtListener();
}

async function deletePerson(person) {
  if (person) {
    const li = document.querySelector(
      `.people [data-id="${person.id.toString()}"]`
    );
    if (li) {
      li.remove();
      if (li.classList.contains("active")) {
        document.querySelector(
          "ul.idea-list"
        ).innerHTML = `<p class="empty">Please select a person to show gifts</p>`;
      }
    }
  } else {
    const li = document.querySelector(".delete");
    if (li) {
      const personId = li.dataset.id;
      try {
        await deleteDoc(doc(db, "people", personId));
        const name = li.querySelector("p.name").textContent;
        tellUser(`<p>Person "${name}" has been deleted.`);
        li.remove();
        if (selectedPersonId === personId) {
          document.querySelector(
            "ul.idea-list"
          ).innerHTML = `<p class="empty">Please select a person to show gifts</p>`;
        }
      } catch (err) {
        console.log(err.message);
      }
    }
  }
  hideOverlay();
  const checkIfOnlyPerson = document.querySelector("ul.person-list li");
  if (!checkIfOnlyPerson) {
    const ul = document.querySelector("ul.person-list");
    ul.innerHTML = `<p class="empty">Oops! Looks like there are no people added</p>`;
  }
}

async function deleteGift(gift) {
  if (gift) {
    const li = document.querySelector(
      `.ideas [data-id="${gift.id.toString()}"]`
    );
    if (li) {
      li.remove();
    }
  } else {
    const li = document.querySelector(".delete");
    if (li) {
      const giftId = li.dataset.id;
      try {
        await deleteDoc(doc(db, "gift-ideas", giftId));
        const name = li.querySelector("p.title").textContent;
        li.remove();
        hideOverlay();
        tellUser(`<p>Gift "${name}" has been deleted.`);
      } catch (err) {
        console.log(err.message);
      }
    }
  }
  //If it is the only gift, call buildIdeas with no gifts
  const checkIfOnlyGift = document.querySelector("ul.idea-list li");
  if (!checkIfOnlyGift) {
    buildIdeas([]);
  }
}

async function editPersonDialog(li) {
  const id = li.dataset.id;
  const docRef = doc(db, "people", id);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  const dialog = document.getElementById("dlgPerson");
  dialog.classList.add("ref");
  dialog.dataset.id = id;
  dialog.querySelector("#name").value = data.name;
  dialog.querySelector("#month").value = parseInt(data["birth-month"]);
  dialog.querySelector("#day").value = parseInt(data["birth-day"]);
}

async function editIdeaDialog(li) {
  const id = li.dataset.id;
  const docRef = doc(db, "gift-ideas", id);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  const dialog = document.getElementById("dlgIdea");
  dialog.classList.add("ref");
  dialog.dataset.id = id;
  dialog.querySelector("#title").value = data.idea;
  dialog.querySelector("#location").value = data.location;
}

function addBoughtListener() {
  const checkboxes = document.querySelectorAll(".idea input[type=checkbox]");
  if (checkboxes) {
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", boughtCheckbox);
    });
  }
}

async function boughtCheckbox(ev) {
  const checkbox = ev.target;
  const id = checkbox.id.toString().split("-")[1];
  try {
    const docRef = doc(db, "gift-ideas", id);
    if (ev.target.checked) {
      await updateDoc(docRef, {
        bought: true,
      });
      ev.target.closest(".idea").classList.add("bought");
    } else {
      await updateDoc(docRef, {
        bought: false,
      });
      ev.target.closest(".idea").classList.remove("bought");
    }
  } catch (err) {
    console.log(err.message);
  }
}

async function addOnSnapShotPeople() {
  let firstCall = true;
  const userRef = await getUser();
  const snapshotQuery = query(
    collection(db, "people"),
    where("owner", "==", userRef)
  );
  const unsubscribe = onSnapshot(
    snapshotQuery,
    (snapshot) => {
      if (firstCall) {
        getPeople(snapshot);
        firstCall = false;
      } else {
        snapshot.docChanges().forEach((change) => {
          //local changes will be handled directly
          if (change.doc.metadata.hasPendingWrites) {
            console.log("local change");
          } else {
            //only database side changes(includes if someone else changes stuff on website in parallel)
            const person = change.doc.data();
            const personId = change.doc.id;
            person.id = personId;
            switch (change.type) {
              case "added":
                showPerson(person);
                break;
              case "modified":
                showPerson(person);
                break;
              case "removed":
                deletePerson(person);
                break;
            }
          }
        });
      }
    },
    (error) => {
      console.log("error listening to changes, please reload the page", error);
    }
  );
}

function addOnSnapShotGifts(personId) {
  let firstCall = true;
  const personRef = doc(collection(db, "people"), personId);
  const q = query(
    collection(db, "gift-ideas"),
    where("person-id", "==", personRef)
  );
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (firstCall) {
        getIdeas(snapshot);
        firstCall = false;
      } else {
        snapshot.docChanges().forEach((change) => {
          //local changes will be handled directly
          if (change.doc.metadata.hasPendingWrites) {
            console.log("local change");
          } else {
            //only database side changes(includes if someone else changes stuff on website in parallel)
            const gift = change.doc.data();
            const giftId = change.doc.id;
            gift.id = giftId;
            if (selectedPersonId === personId) {
              //update only onscreen gifts, rest are fetched directly from DB
              switch (change.type) {
                case "added":
                  showGift(gift);
                  break;
                case "modified":
                  showGift(gift);
                  break;
                case "removed":
                  deleteGift(gift);
                  break;
              }
            }
          }
        });
      }
    },
    (error) => {
      console.log("error listening to changes, please reload the page", error);
    }
  );
}

function attemptLogin() {
  setPersistence(auth, browserSessionPersistence)
    .then(() => {
      signInWithPopup(auth, provider)
        .then((result) => {
          const credential = GithubAuthProvider.credentialFromResult(result);
          addUserDetails(result.user);
          const token = credential.accessToken;
          sessionStorage.setItem("token", token);
          logIn(true);
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          const credential = GithubAuthProvider.credentialFromError(error);
          console.log(errorCode, errorMessage, credential);
        });
    })
    .catch((err) =>
      console.log(
        "failed to set Persistence to Session storage:",
        err.code,
        err.message
      )
    );
}

function logout() {
  signOut(auth)
    .then(() => {
      logIn(false);
    })
    .catch((error) => {
      console.log("error signing out" + error);
    });
}

onAuthStateChanged(auth, (user) => {
  const token = sessionStorage.getItem("token");
  if (user && token) {
    validateWithToken(token);
  } else if (!user) {
    logout();
  }
});

function validateWithToken(token) {
  const credential = GithubAuthProvider.credential(token);
  signInWithCredential(auth, credential)
    .then((result) => {
      console.log("authenticated with signInWithCredential");
      logIn(true);
    })
    .catch((err) => {
      logout();
      console.log(err);
    });
}

function logIn(status) {
  if (status) {
    //if user is logged in
    loggedIn = true;
    //toggle button
    document.getElementById("authLogin").classList.remove("visible");
    document.getElementById("authLogout").classList.add("visible");
    document.body.className = "loggedIn";
    //build lists
    addOnSnapShotPeople();
  } else {
    //if user is logged out
    loggedIn = false;
    //toggle button
    document.getElementById("authLogin").classList.add("visible");
    document.getElementById("authLogout").classList.remove("visible");
    document.body.className = "welcome";

    //clear people as well as gifts
    document.querySelector(".person-list").replaceChildren();
    document.querySelector(".idea-list").replaceChildren();

    //clear session storage
    sessionStorage.clear();
  }
}

async function addUserDetails(userDetails) {
  try {
    const userRef = collection(db, "users");
    await setDoc(
      doc(userRef, userDetails.uid),
      {
        displayName: userDetails.displayName,
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Error adding document: ", err);
  }
}

async function getUser(id = false) {
  const ref = doc(db, "users", auth.currentUser.uid);
  if (id) {
    const owner = await getDoc(ref);
    return owner;
  }
  return ref;
}
