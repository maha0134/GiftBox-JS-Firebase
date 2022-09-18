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

document.addEventListener("DOMContentLoaded", () => {
  //set up the dom events
  document
    .getElementById("btnCancelPerson")
    .addEventListener("click", hideOverlay);
  document
    .getElementById("btnCancelIdea")
    .addEventListener("click", hideOverlay);
  // document.querySelector(".overlay").addEventListener("click", hideOverlay);

  document
    .getElementById("btnAddPerson")
    .addEventListener("click", showOverlay);
  document.getElementById("btnAddIdea").addEventListener("click", showOverlay);
  document.getElementById("btnSaveIdea").addEventListener("click", saveIdea);
  document
    .getElementById("btnSavePerson")
    .addEventListener("click", savePerson);
  document.querySelector("ul.person-list").addEventListener("click", (ev) => {
    if (ev.target.closest("i")) {
      deletePerson(ev);
    } else {
      personClicked(ev);
    }
  });
  document.querySelector("ul.idea-list").addEventListener("click", (ev) => {
    if (ev.target.closest("i")) deleteGift(ev);
  });
  getPeople();
});

function hideOverlay() {
  document.querySelector(".overlay").classList.remove("active");
  document
    .querySelectorAll(".overlay dialog")
    .forEach((dialog) => dialog.classList.remove("active"));
}
function showOverlay(ev) {
  document.querySelector(".overlay").classList.add("active");
  const id = ev.target.id === "btnAddPerson" ? "dlgPerson" : "dlgIdea";
  //TODO: check that person is selected before adding an idea
  document.getElementById(id).classList.add("active");
}

async function getPeople() {
  const people = []; //to hold all the people from the collection
  const querySnapshot = await getDocs(collection(db, "people"));
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
  //replace the old ul contents with the new.
  ul.innerHTML = "";
  ul.innerHTML = people
    .map((person) => {
      const dob = `${months[person["birth-month"] - 1]} ${person["birth-day"]}`;
      if (index == 0) {
        index += 1;
        return `<li data-id="${person.id}" class="person active">
                <div class="content"><p class="name">${person.name}</p>
                <p class="dob">${dob}</p></div>
                <i class="material-icons-outlined">delete</i>
              </li>`;
      }
      return `<li data-id="${person.id}" class="person">
                <div class="content"><p class="name">${person.name}</p>
                <p class="dob">${dob}</p></div>
                <i class="material-icons-outlined">delete</i>
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
        return `<li class="idea" data-id = ${gift.id}><label for="chk-uniqueid"><input type="checkbox" id="chk-uniqueid" /> Bought</label>
      <p class="title">${gift.idea}</p>
      <p class="location">${gift.location}</p>
      <i class="material-icons-outlined">delete</i>
      </li>`;
      })
      .join("");
  } else {
    console.log;
    ul.innerHTML = `<p class="empty">Oops! Looks like there are no gifts added for the selected person</p>`;
  }
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
    const docRef = await addDoc(collection(db, "people"), person);
    console.log("Document written with ID: ", docRef.id);
    //1. clear the form fields
    document.getElementById("name").value = "";
    document.getElementById("month").value = "";
    document.getElementById("day").value = "";
    //2. hide the dialog and the overlay
    hideOverlay();
    //3. display a message to the user about success
    tellUser(`Person ${name} added to database`);
    person.id = docRef.id;
    //4. ADD the new HTML to the <ul> using the new object
    showPerson(person);
  } catch (err) {
    console.error("Error adding document: ", err);
    //do you want to stay on the dialog?
    //display a mesage to the user about the problem
  }
}
//TODO
function tellUser(info) {}
//TODO add the icon tags here too
function showPerson(person) {
  let li = document.getElementById(person.id);
  if (li) {
    //update on screen
    const dob = `${months[person["birth-month"] - 1]} ${person["birth-day"]}`;
    //Use the number of the birth-month less 1 as the index for the months array
    //replace the existing li with this new HTML
    li.outerHTML = `<li data-id="${person.id}" class="person">
            <p class="name">${person.name}</p>
            <p class="dob">${dob}</p>
          </li>`;
  } else {
    //add to screen
    const dob = `${months[person["birth-month"] - 1]} ${person["birth-day"]}`;
    //Use the number of the birth-month less 1 as the index for the months array
    li = `<li data-id="${person.id}" class="person">
            <p class="name">${person.name}</p>
            <p class="dob">${dob}</p>
          </li>`;
    document.querySelector("ul.person-list").innerHTML += li;
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
    const docRef = await addDoc(collection(db, "gift-ideas"), giftIdea);
    console.log("Document written with ID: ", docRef.id);
    //1. clear the form fields
    document.getElementById("title").value = "";
    document.getElementById("location").value = "";
    // document.getElementById("day").value = "";
    //2. hide the dialog and the overlay
    hideOverlay();
    //3. display a message to the user about success
    tellUser(`Gift idea ${title} added to database`);
    // giftIdea.id = docRef.id;
    //4. ADD the new HTML to the <ul> using the new object
    showGift(giftIdea);
  } catch (err) {
    console.error("Error adding document: ", err);
    //do you want to stay on the dialog?
    //display a mesage to the user about the problem
  }
}

function showGift(giftIdea) {
  const liData = `<li data-id=${giftIdea.id} class="idea">
                    <label for="chk-uniqueid"><input type="checkbox" id="chk-uniqueid" /> Bought</label>
                    <p class="title">${giftIdea.idea}</p>
                    <p class="location">${giftIdea.location}</p>`;
  const li = document.getElementById(giftIdea.id);
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
}

async function deletePerson(ev) {
  console.log("Ready to delete");
  const personId = ev.target.parentElement.dataset.id;
  try {
    await deleteDoc(doc(db, "people", personId));
    ev.target.parentElement.outerHTML = "";
    const giftIdeas = document.querySelectorAll("ul.idea-list .idea");
    deleteGiftsFromDB(giftIdeas);
  } catch (err) {
    console.log(err.message);
  }
}

async function deleteGift(ev) {
  console.log("Delete a gift");
}

async function deleteGiftsFromDB(giftIdeas) {
  document.querySelector(
    "ul.idea-list"
  ).innerHTML = `<p class="empty">Please select a person to show gifts</p>`;
  try {
    giftIdeas.forEach((gift) => {
      const giftId = gift.dataset.id;
      //skipping await as it needs to be in top level module
      //better done with batch operations
      deleteDoc(doc(db, "gift-ideas", giftId));
    });
  } catch (err) {
    console.log(err.message);
  }
}
