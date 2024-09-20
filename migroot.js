<script>
function showLoader(cardId, show, text = 'Loading...') {
    const loader = document.querySelector(`#${cardId} .ac-doc__loader`);
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
        if (show) {
            loader.textContent = text;
        }
    }
}
function handleFileUpload(button) {
    const container = button.closest('.ac-doc__files');
    const cardId = container.closest('.ac-doc').id;
    const backendCardId = cardId.match(/\d+/)[0];
    const fileInput = container.querySelector('.fileInput');
    const statusMessage = container.querySelector('.statusMessage');
    const filetype = button.dataset['filetype'];
    const file = fileInput.files[0];

    // Helper functions
    function setStatus(message) {
        statusMessage.textContent = message;
    }

    function isFileValid(file) {
        if (!file) {
            setStatus('File not found');
            return false;
        } else if (fileInput.files.length > 1) {
            setStatus('Only one file accepted');
            return false;
        } else if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
            setStatus('Wrong format');
            return false;
        } else if (file.size > 10 * 1024 * 1024) { // 10MB
            setStatus('Please choose file under 10MB');
            return false;
        } else {
            setStatus('Upload started');
            return true;
        }
    }


    function uploadFile(base64File, file, cardId, filetype) {
        const data = {
            base64file: base64File,
            mimetype: file.type,
            username: username,
            email: usermail,
            filename: file.name
        };

        return fetch('https://gcloud-apisaver-674832863057.europe-west1.run.app/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error during upload file.');
            }
            return response.json();
        })
        .then(data => {
            const updatedUrl = data.file_url;
            UpdateCardUrl(backendCardId, updatedUrl, filetype);
        })
        .catch(error => {
            console.error('Error updating url:', error);
            showLoader(cardId, false);
        })
        .finally(() => {
          // notification show
        });
    }

    // Main logic
    if (!isFileValid(file)) return;


    const reader = new FileReader();
    reader.onload = function () {
        showLoader(cardId, true, 'Showing your doc to MIGROoT');
        const base64File = reader.result.split(',')[1];
        uploadFile(base64File, file, cardId, filetype)
            .then(() => setStatus(`File uploaded: "${file.name}"`))
            .catch(error => {
                console.error('Error during read and upload:', error);
                setStatus('Error during read and upload');
                showLoader(cardId, false);
            })
            .finally(() => {
                // notification show
            });
    };
    reader.readAsDataURL(file);
};
</script>
<script>

async function fetchGetData() {
    const response = await fetch(get_url);
    const data = await response.json();
    data.result.forEach(item => {
			CreateCard(item);
    });
};

function getStatusContainer(status) {
    switch (status) {
        case 'Not started':
            return notStartedContainer;
        case 'In progress':
            return inProgressContainer;
        case 'Ready':
            return readyContainer;
        default:
            console.error('Неизвестный статус:', status);
            return notStartedContainer;
    }
};

function CreateCard(item) {
    const targetContainer = getStatusContainer(item.Status);
    const new_id = `doc-${item.id}`
    const clone = template.cloneNode(true);
    clone.getElementsByClassName('ac-doc__title')[0].textContent = item.DocumentTitle;
    clone.getElementsByClassName('ac-doc__description')[0].textContent = item.Description;
    clone.getElementsByClassName('ac-docs__mark ac-docs__due_date')[0].textContent = formatDateToLocal(item.DueDate);
    clone.getElementsByClassName('ac-docs__mark ac-docs__mark_country')[0].textContent = item.Location;
    clone.getElementsByClassName('ac-docs__mark ac-docs__applicicant')[0].textContent = item.Applicant;
    // if item.Comment == '' or empty
    // delete Comment block or insert random MIGROoT quote
    clone.getElementsByClassName('ac-comment__text')[0].textContent = item.Comment;
    // if item.OriginalStatus == 'Not needed'
    // delete original file block
    // delete translate file block
    // else if item.TranslateStatus == 'Not needed'
    // delete translate file block
    // end
    //
    // if item.OriginalStatus == 'Verified' and item.TranslateStatus == 'Verified'
    // delete upload button
    // add links to Original
    // add links to Tranlate
    // else if item.originalStatus == 'Verified'
    // add links to Original
    // set data-filetype = 'Translate' to button  (data-filetype = 'Original' by defalt)
    // change button name to Upload Translated Document  ('Upload Original document' by defalt)
    // end

    // if IconStatus
    // do somethins
    //
    var old_card = document.getElementById(new_id);
    if (old_card) {
        old_card.remove();
    }
    clone.id = new_id;
    targetContainer.insertBefore(clone, targetContainer.firstChild);
};


function UpdateCardUrl(id, url, filetype) {
		cardId = `doc-${id}`
		showLoader(cardId, true, 'Updating groots...');
    var keyLink = filetype + 'Link'
    var keyStatus = filetype + 'Status'
    var data = {
      id: id,
      [keyLink]: url,
      [keyStatus]: 'Uploaded',
      IconStatus: 'Off',
      Status: 'In progress'
    };
    
    fetch(post_url, {
        redirect: "follow",
        method: 'POST',
        headers: {
        "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        var updatedData = data.result.updatedData;
        CreateCard(updatedData);
    })
    .catch(error => {
        console.error('Error updating card:', error);
        showLoader(cardId, false);
    })
    .finally(() => {
      // notification show
    });
};

// helper functions
function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
function getUser() {
  return user.Email;
};
function getUserMail() {
  return user.Email;
};

async function fetchUser() {
  try {
    user = await Outseta.getUser(); // Присваиваем результат внешней переменной
  } catch (error) {
    console.error(error); // Обработка ошибки
  }
  return user;
}

function formatDateToLocal(isoString) {
  const date = new Date(isoString);
  const options = { day: 'numeric', month: 'short', timeZone: userTimeZone };
  const formattedDate = date.toLocaleDateString('en-GB', options);
  return formattedDate;
};
// set constans
const readyContainer = document.getElementById('ready');
const inProgressContainer = document.getElementById('in-progress');
const notStartedContainer = document.getElementById('not-started');
let user = null;
var username = null;
var usermail = null;
var get_url =  null;
var post_url = null;
const web_url = 'https://script.google.com/macros/s/AKfycbxP92rtwGOSe2Qr-73RBYC86c7ESknr94SeIVfeRwVbFhJK4Qt7PHC-mMr9Fr-eQ88FUA/exec?user=';
const userTimeZone = getUserTimeZone();
const template = document.getElementById('doc-template');

function waitForOutseta() {
  return new Promise((resolve) => {
    const checkOutseta = setInterval(() => {
      if (typeof Outseta !== 'undefined') { // Проверяем, доступен ли объект Outseta
      	console.log('outseta loaaded');
        clearInterval(checkOutseta); // Очищаем таймер, если объект найден
        resolve(); // Разрешаем промис
      }
    }, 100); // Проверяем каждые 100 миллисекунд
  });
};

window.onload = async function() {
  try {
    await waitForOutseta(); // Ждем появления объекта Outseta
    await fetchUser(); // Ждем завершения fetchUser
    username = getUser();
    console.log(username);
    usermail = getUserMail();
    get_url = web_url + username + '&action=getData';
    console.log("GET URL:", get_url);

    post_url = web_url + username;
    console.log("POST URL:", post_url);
    await fetchGetData(); // Выполняем fetchGetData после успешного выполнения fetchUser
  } catch (error) {
    console.error("Ошибка при выполнении fetchUser или fetchGetData:", error);
  }
};



</script>
