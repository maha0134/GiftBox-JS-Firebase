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

document.addEventListener("DOMContentLoaded", () => {
  //set up the dom events
  //Cancel Buttons
  document
    .getElementById("btnCancelPerson")
    .addEventListener("click", hideOverlay);
  document
    .getElementById("btnCancelIdea")
    .addEventListener("click", hideOverlay);

  //Add Buttons
  document
    .getElementById("btnAddPerson")
    .addEventListener("click", showOverlay);
  document.getElementById("btnAddIdea").addEventListener("click", (ev) => {
    if (document.querySelector("ul.person-list .person.active")) {
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
  addOnSnapShotPeople();
});

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
    document.querySelector(".ref").outerHTML = "";
    editPerson.classList.remove("editPerson");
  }
  const editIdea = document.querySelector(".editIdea");
  if (editIdea) {
    document.querySelector(".ref").outerHTML = "";
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
    getIdeas(people[0].id);
  } else {
    const ul = document.querySelector("ul.person-list");
    ul.innerHTML = "";
    ul.innerHTML = `<p class="empty">Oops! Looks like there are no people added</p>`;
  }
}

function buildPeople(people) {
  //build the HTML
  let ul = document.querySelector("ul.person-list");
  let index = 0;
  //replace the old ul contents with the new
  ul.innerHTML = "";
  ul.innerHTML = people
    .map((person) => {
      const dob = `${months[person["birth-month"] - 1]} ${person["birth-day"]}`;
      if (index == 0) {
        index += 1;
        selectedPersonId = person.id;
        return `<li data-id="${person.id}" class="person active">
                <span class="content"><p class="name">${person.name}</p>
                <p class="dob">${dob}</p></span>
                <span class="icons">
                <i class="material-icons-outlined"id="btnEditPerson">edit</i>
                <i class="material-icons-outlined" id="btnDelete">delete</i></span>
              </li>`;
      }
      return `<li data-id="${person.id}" class="person">
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
    getIdeas(id);
  }
}

async function getIdeas(id) {
  //get an actual reference to the person document
  const personRef = doc(collection(db, "people"), id);
  const gifts = []; //to hold the giftIdeas
  //then run a query where the `person-id` property matches the reference for the person
  const docs = query(
    collection(db, "gift-ideas"),
    where("person-id", "==", personRef)
  );
  const querySnapshot = await getDocs(docs);
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
          return `<li class="idea" data-id = ${gift.id}><label for="chk-${gift.id}"><input type="checkbox" id="chk-${gift.id}" checked /> Bought</label>
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
    console.log;
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
  const person = {
    name,
    "birth-month": month,
    "birth-day": day,
  };
  try {
    let docRef;
    const ref = document.querySelector(".ref");
    if (ref) {
      const personId = ref.textContent.toString().split(":")[1];
      const documentRef = doc(db, "people", personId);
      await setDoc(documentRef, person);
      person.id = personId;
      console.log("Document edited");
      tellUser(`<p>Person "${name}" edited.</p>`);
    } else {
      docRef = await addDoc(collection(db, "people"), person);
      console.log("Document written with ID: ", docRef.id);
      tellUser(`<p>Person "${name}" added to database.</p>`);
      person.id = docRef.id;
    }
    //1. clear the form fields
    document.getElementById("name").value = "";
    document.getElementById("month").value = "";
    document.getElementById("day").value = "";
    //2. hide the dialog and the overlay
    hideOverlay();
    //3. display a message to the user about success

    //4. ADD the new HTML to the <ul> using the new object
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
      const giftId = ref.textContent.toString().split(":")[1];
      const boughtCheckbox = document.querySelector(
        `.idea input[id=chk-${giftId}]`
      );
      giftIdea.bought = boughtCheckbox.checked;
      const documentRef = doc(db, "gift-ideas", giftId);
      await setDoc(documentRef, giftIdea);
      giftIdea.id = giftId;
      console.log("Document edited");
      tellUser(`<p>Gift Idea "${title}" edited.</p>`);
    } else {
      docRef = await addDoc(collection(db, "gift-ideas"), giftIdea);
      console.log("Document written with ID: ", docRef.id);
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
      li.outerHTML = "";
      if (li.classList.contains("active")) {
        document.querySelector(
          "ul.idea-list"
        ).innerHTML = `<p class="empty">Please select a person to show gifts</p>`;
      }
    }
  } else {
    const li = document.querySelector(".delete");
    const personId = li.dataset.id;
    try {
      await deleteDoc(doc(db, "people", personId));
      const name = li.querySelector("p.name").textContent;
      tellUser(`<p>Person "${name}" has been deleted.`);
      li.outerHTML = "";
      if (selectedPersonId === personId) {
        document.querySelector(
          "ul.idea-list"
        ).innerHTML = `<p class="empty">Please select a person to show gifts</p>`;
      }
      hideOverlay();
    } catch (err) {
      console.log(err.message);
    }
  }
  const checkIfOnlyPerson = document.querySelector("ul.person-list li");
  if (!checkIfOnlyPerson) {
    const ul = document.querySelector("ul.person-list");
    ul.innerHTML = `<p class="empty">Oops! Looks like there are no people added</p>`;
  }
}

async function deleteGift() {
  const li = document.querySelector(".delete");
  const giftId = li.dataset.id;
  try {
    await deleteDoc(doc(db, "gift-ideas", giftId));
    const name = li.querySelector("p.title").textContent;
    tellUser(`<p>Gift "${name}" has been deleted.`);
    li.outerHTML = "";
    hideOverlay();
    //If it is the only gift, call buildIdeas with no gifts
    const checkIfOnlyGift = document.querySelector("ul.idea-list li");
    if (!checkIfOnlyGift) {
      buildIdeas([]);
    }
  } catch (err) {
    console.log(err.message);
  }
}
//Experimental code
// async function deleteGiftsFromDB(giftIdeas) {
//   document.querySelector(
//     "ul.idea-list"
//   ).innerHTML = `<p class="empty">Please select a person to show gifts</p>`;
//   // try {
//   //   giftIdeas.forEach((gift) => {
//   //     const giftId = gift.dataset.id;
//   //     //skipping await as it needs to be in top level module
//   //     //better done with batch operations
//   //     deleteDoc(doc(db, "gift-ideas", giftId));
//   //   });
//   // } catch (err) {
//   //   console.log(err.message);
//   // }
// }

async function editPersonDialog(li) {
  const id = li.dataset.id;
  const docRef = doc(db, "people", id);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  const dialog = document.getElementById("dlgPerson");
  const refPara = document.createElement("p");
  refPara.textContent = `Person id:${id}`;
  refPara.classList.add("ref");
  dialog.insertBefore(refPara, dialog.children[1]);
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
  const refPara = document.createElement("p");
  refPara.textContent = `Gift Idea id:${id}`;
  refPara.classList.add("ref");
  dialog.insertBefore(refPara, dialog.children[1]);
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
    } else {
      await updateDoc(docRef, {
        bought: false,
      });
    }
  } catch (err) {
    console.log(err.message);
  }
}

function addOnSnapShotPeople() {
  let firstCall = true;
  const unsubscribe = onSnapshot(
    collection(db, "people"),
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
              default:
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
function addOnSnapShotGifts() {
  let firstCall = true;
  const unsubscribe = onSnapshot(
    collection(db, "people"),
    (snapshot) => {
      if (firstCall) {
        getPeople(snapshot);
        firstCall = false;
        console.log("am i building again?");
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
              default:
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
