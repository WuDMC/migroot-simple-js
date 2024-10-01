<script>
// Constants
const template = document.getElementById('doc-template');
const btn_upload_file = document.getElementById('upload_file').innerHTML;
const btn_open_tf = document.getElementById('open_tf').innerHTML;
const btn_open_url = document.getElementById('open_url').innerHTML;
const btn_submit_url = document.getElementById('submit_url').innerHTML;
const readyContainer = document.getElementById('ready');
const inProgressContainer = document.getElementById('in-progress');
const notStartedContainer = document.getElementById('not-started');
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
var username = null;
var usermail = null;
var get_url = null;
var post_url = null;
var user = null;
var userplan = null;
var usercoins = 0;

async function fetchUser() {
    try {
        user = await Outseta.getUser();
    } catch (error) {
        console.error(error);
    }
    return user;
};

//logic init dashboard

// Fetch data from the server
async function fetchGetData() {
    const response = await fetch(get_url);
    const data = await response.json();
    data.result.forEach(item => {
        CreateCard(item);
    });
  	await waitForTFAndReload();
}

// Helper functions
function getUser() {
    return user.Email;
};

function getUserMail() {
    return user.Email;
};

function getUserPlan() {
	return user.Account.CurrentSubscription.Plan.Name;
};


// sleep 
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

function clearContainers() {
    readyContainer.innerHTML = '';        // Очищает контейнер 'ready'
    inProgressContainer.innerHTML = '';   // Очищает контейнер 'in-progress'
    notStartedContainer.innerHTML = '';   // Очищает контейнер 'not-started'
};

// add SS ID from account
function updateWebUrl(url, providelinkId = null) {
		if (providelinkId) return url + `?link=${providelinkId}` + "&user="
    if (user && user.Account.LinkId && user.Account.LinkId.trim() !== "") {
        let new_url = url + `?link=${user.Account.LinkId}` + "&user=";
        return new_url;
    } else {
        return url + "?user="; 
    }
};



// Wait for Outseta object to load and then fetch data
function waitForOutseta() {
    return new Promise((resolve, reject) => {
        const checkOutseta = setInterval(() => {
            if (typeof Outseta !== 'undefined') {
                clearInterval(checkOutseta);
                resolve();
            }
        }, 100);

        // Остановить проверку и выкинуть ошибку через 3 секунды
        setTimeout(() => {
            clearInterval(checkOutseta);
            reject(new Error('Outseta loading error'));
        }, 5000);
    });
};

async function waitForTFAndReload() {
    const checkInterval = 100; 
    const intervalId = setInterval(() => {
        if (typeof window.tf !== 'undefined') {
            const buttons = document.querySelectorAll('button[data-tf-popup]');
            let allLoaded = true;
            buttons.forEach(button => {
                if (!button.hasAttribute('data-tf-loaded') || button.getAttribute('data-tf-loaded') !== 'true') {
                    allLoaded = false; 
                    window.tf.reload(); 
                }
            });
            if (allLoaded) {
                clearInterval(intervalId);
            }
        } else {
            console.log("waiting for tf");
        }
    }, checkInterval);
}

async function itinDashboard(providedUsername = null, providelinkId = null) {
    try {
    		clearContainers();
        if (providedUsername) {
        	username = providedUsername;
        	usermail = providedUsername;
        } else {
          await fetchUser();
 					userplan = getUserPlan();
        	username = getUser();
        	usermail = getUserMail();
        };
				let web_url = 'https://script.google.com/macros/s/AKfycbxLRZANt4ayb0x_IRClCEw6cjA5s7b2Iv6v4sjNMmNbL1WMsNTx32eK1q8zw4CHVOJq0Q/exec';
				web_url = updateWebUrl(web_url, providelinkId);
        get_url = `${web_url}${username}&action=getData`;
        post_url = `${web_url}${username}&action=updateData`;
        fetchGetData(get_url); // передаем URL для получения данных
    } catch (error) {
        console.error("Error during  init dashboard:", error);
    }
};

window.onload = async function () {
    try {
        await waitForOutseta();
				await itinDashboard();
    } catch (error) {
        console.error("Error during dashboard initializing on window on load:", error);
    }
};
</script>
<script>
  // logic for work with cards
  const emotions = [
    "normal",
    "smile",
    "surprise"
  ];

  const MigrootReviewComments = [
    "Wait for checking",
    "So-o-o-on please wait",
    "Okay, let's see!"
  ];

  const MigrootStartComments = [
    "Every document tells a story.",
    "Efficiency is key in document management.",
    "Timely action is critical to success."
  ];

  function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  // general
  function CreateCard(item) {
    if (item.TaskType === 'task-free' && userplan !== 'Free registration') {
      // task free is additional cards which should be added only for free plan users
      return;
    }
    if (item.TaskType === 'task-paid' && userplan == 'Free registration') {
      // task paid is additional cards which should be added only for paid plan users
      return;
    }

    const targetContainer = getStatusContainer(item.Status);
    const new_id = `doc-${item.id}`;
    const clone = template.cloneNode(true);

    setCardContent(clone, item);
    handeDataAttr(clone, item);
    handleComment(clone, item);
    handleButton(clone, item);
    handleFileStatus(clone, item);
    if (clone.getAttribute('data-task-type') == 'document' ) {
      handleDoc(clone, item)
    } else {
      handleTask(clone, item);
    };

    const old_card = document.getElementById(new_id);
    if (old_card) {
      old_card.remove();
    }

    clone.id = new_id;
    targetContainer.insertBefore(clone, targetContainer.firstChild);
  }

  function updateCard(data, cardId) {
    fetch(post_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(data => {
      const updatedData = data.result.updatedData;
      CreateCard(updatedData);
    })
      .catch(error => {
      console.error('Error updating card:', error);
      showLoader(cardId, false);
    });
  };
  // general end


  // Update card URL after file upload
  function UpdateCardUrl(id, url, filetype) {
    const cardId = `doc-${id}`;
    showLoader(cardId, true, 'Updating groots...');
    const data = {
      id: id,
      [`${filetype}Link`]: url,
      [`${filetype}Status`]: 'Uploaded',
      UserComment: 'check my file please',
      IconStatus: 'off',
      Status: 'In progress',
      Emotion: getRandom(emotions),
      Comment: getRandom(MigrootReviewComments)
    };
    updateCard(data, cardId);
  }

  // Update card comment after task done
  function UpdateCardComment(id, Comment) {
    const cardId = `doc-${id}`;
    showLoader(cardId, true, 'Updating groots');
    const data = {
      id: id,
      UserComment: Comment,
      IconStatus: 'off',
      Status: 'In progress',
      Emotion: getRandom(emotions),
      Comment: getRandom(MigrootReviewComments)
    };
    updateCard(data, cardId);
  }

  // to open link from task and change button name
  function handleUrlRead(button) {
    url = button.getAttribute('data-btn-link');
    window.open(url, '_blank');
    const uploadContainer = button.closest('.ac-doc__action');
    uploadContainer.innerHTML = btn_submit_url;
  };

  // submit task
  function handleUrlSubmit(button) {
    const docContainer = button.closest('.ac-doc');
    const cardId = docContainer.id;
    const backendCardId = cardId.match(/\d+/)[0];
    const comment = docContainer.querySelector('input').value;
    // add raise if comment is empty
    UpdateCardComment(backendCardId, comment);
  };


  // Get container based on status
  function getStatusContainer(status) {
    switch (status) {
      case 'Not started':
        return notStartedContainer;
      case 'In progress':
        return inProgressContainer;
      case 'Ready':
        return readyContainer;
      default:
        console.error('Unknown status:', status);
        return notStartedContainer;
    }
  }

  function getUserTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  function formatDateToLocal(isoString) {
    const date = new Date(isoString);
    const options = { day: 'numeric', month: 'short', timeZone: userTimeZone };
    return date.toLocaleDateString('en-GB', options);
  };

  // common card content for all quests
  function setCardContent(clone, item) {
    clone.getElementsByClassName('ac-doc__title')[0].textContent = item.DocumentTitle;
    clone.getElementsByClassName('ac-doc__description')[0].textContent = item.Description;
    clone.getElementsByClassName('ac-docs__mark ac-docs__due_date')[0].textContent = formatDateToLocal(item.DueDate);

    clone.getElementsByClassName('ac-docs__mark ac-docs__mark_country')[0].textContent = item.Location;
    clone.getElementsByClassName('ac-docs__mark ac-docs__applicicant')[0].textContent = item.Applicant === 'You' && user ? user.FirstName : item.Applicant;
  };

  // data attrs logic
  function handeDataAttr(clone, item) {
    clone.setAttribute('data-icon-status', item.IconStatus);
    clone.setAttribute('data-original-status', item.OriginalStatus);
    clone.setAttribute('data-translate-status', item.TranslateStatus);

    clone.setAttribute('data-task-type', item.TaskType);
    clone.setAttribute('data-points', item.Points);
    clone.setAttribute('data-applicant-id', item.ApplicantID);
    clone.setAttribute('data-emotion', item.Emotion);
  }

  // if comment from migroot is empty add random
  function handleComment(clone, item) {
    if (!item.Comment || item.Comment.trim() === '') {
      clone.getElementsByClassName('ac-comment__text')[0].textContent = getRandom(MigrootStartComments);
      ;
    } else {
      clone.getElementsByClassName('ac-comment__text')[0].textContent = item.Comment;
    }
  };

  function handleButton(clone, item) {
    const uploadContainer = clone.querySelector('.ac-doc__action');
    const ButtonLink = item.ButtonLink;
    const typeformLink = item.ButtonLink.match(/TF=(.*)/);
    if (ButtonLink && typeformLink && item.TaskType != 'document') {
    	uploadContainer.innerHTML = btn_open_tf
    } else if (ButtonLink && item.TaskType != 'document') {
    	uploadContainer.innerHTML = btn_open_url
    } else {
    	uploadContainer.innerHTML = btn_upload_file
    }
  };

 function handleFileStatus(clone, item) {
    if (item.id == '1') {
      console.log('1')
    }
    const filesProgressBlock = clone.querySelector('.ac-doc__progress-bar');
    const originalFileBlock = clone.querySelector('.original-file-block');
    const translateFileBlock = clone.querySelector('.translate-file-block');
		const uploadContainer = clone.querySelector('.ac-doc__action');
    const originalLink = clone.querySelector('.original-link');
    const translateLink = clone.querySelector('.translate-link');
    
    if (item.OriginalStatus != 'Not uploaded') {
      if (originalLink) originalLink.href = item.OriginalLink;
    };
    
    if (item.TranslateStatus != 'Not uploaded') {
      if (translateLink) translateLink.href = item.TranslateLink;
    };
    
    if (item.OriginalStatus === 'Verified' && (item.TaskType != 'document' || item.TranslateStatus === 'Verified' || item.TranslateStatus === 'Not needed')) {
      if (uploadContainer) uploadContainer.remove();
    } else if (item.OriginalStatus === 'Verified' && item.TaskType === 'document') {
      // document with needed and not verified translate
      if (uploadContainer) uploadContainer.querySelector('.ac-submit.w-button').setAttribute('data-filetype', 'Translate');
      // IMPORTANT !!!
      if (uploadContainer) uploadContainer.querySelector('.ac-submit.w-button').innerText = "Upload Translated"
      if (uploadContainer && item.TranslateStatus != 'Not loaded') uploadContainer.querySelector('.ac-submit.w-button').innerText = "Reload Translated"
    } else if (item.Status === 'In progress') {
      // any task in ptogress without a translate and have button
    	button = uploadContainer.querySelector('.ac-submit.w-button')
      if (button) button.innerText = "Reload file"
    };
    
    
    
    if (item.OriginalStatus === 'Not needed') {
      if (filesProgressBlock) filesProgressBlock.remove();
    } else if (item.TranslateStatus === 'Not needed') {
      if (translateFileBlock) translateFileBlock.remove();
    };
};

  function handleTask(clone, item) {
    // if taskType == 'task'
    const translateFileBlock = clone.querySelector('.translate-file-block');
    if (translateFileBlock) translateFileBlock.remove();

    const originalLink = clone.querySelector('.original-link');
    if (originalLink){
      const originalLinkTitle = originalLink.querySelector('.ac-doc__stage-title');
      originalLinkTitle.textContent = "Screenshot";
    }

    if (item.ButtonLink && item.ButtonLink != '') {
      // if taskType == 'task' && HAVE custom button links
      handleTaskButton(clone, item);
    };
  };


  function handleTaskButton(clone, item) {
    // if taskType == 'task' && HAVE custom button links
    const filesProgressBlock = clone.querySelector('.ac-doc__progress-bar');
    if (filesProgressBlock) filesProgressBlock.remove();

    const uploadContainer = clone.querySelector('.ac-doc__action');
    if (item.Status === 'Not started') {
      const typeformLink = item.ButtonLink.match(/TF=(.*)/);
      if (typeformLink) {
        // typeform logic
        const typeformId = typeformLink[1];
        uploadContainer.querySelector('.ac-poll.w-button').setAttribute('data-tf-popup', typeformId);
      } else {
        // standard url open logic
        uploadContainer.querySelector('.ac-link.w-button').setAttribute('data-btn-link', item.ButtonLink);
      }
    } else {
    	// no more links saved !!!! you can not reread it link
      // insert read again for example
      if (uploadContainer) uploadContainer.remove();
    }
  };


  function handleDoc(clone, item) {
    // console.log('do nothing')
  };



  function toggleTileState(stateElement) {
    const doc = stateElement.closest('.ac-doc');
    const docOpen = doc.querySelector('.ac-doc__open');  // Находим элемент ac-doc__open
    const docAlert = doc.querySelector('.ac-doc__alert');  // Находим элемент ac-doc__alert

    if (docOpen) {
      if (docOpen.style.display === 'flex') {
        docOpen.style.display = 'none';
        stateElement.classList.remove('open');  // Убираем статус open
        if (docAlert) {
          docAlert.style.display = 'grid';  // При закрытии делаем alert видимым
        }
      } else {
        docOpen.style.display = 'flex';
        stateElement.classList.add('open');  // Добавляем статус open
        if (docAlert) {
          docAlert.style.display = 'none';  // При открытии скрываем alert
        }
      }
    }
  };

  // loader for card
  function showLoader(cardId, show, text = 'Loading') {
    const loader = document.querySelector(`#${cardId} .ac-doc__loader`);
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
      if (show) {
        loader.querySelector('.ac-doc__loader-text').textContent = text;
      }
    }
  };
</script>

<script>
// upload files logic
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
        showLoader(cardId, true, 'Showing to Migroot');
        const base64File = reader.result.split(',')[1];
        uploadFile(base64File, file, cardId, filetype)
            .then(() => setStatus(`File uploaded: "${file.name}"`))
            .catch(error => {
                console.error('Error during read and upload:', error);
                setStatus('Error during read and upload');
                showLoader(cardId, false);
            });
    };
    reader.readAsDataURL(file);
};
</script>

<script>
  // Mobile Toggle
  document.querySelectorAll('.ac-board__header-mobile').forEach(header => {
    header.addEventListener('click', function() {
      const colWrap = this.closest('.ac-board__col-wrap');
      const embed = this.querySelector('.b-embed'); // Находим элемент b-embed внутри header
      
      if (colWrap) {
        const cols = colWrap.querySelectorAll('.ac-board__col');

        cols.forEach(col => {
          if (col.style.display === 'flex') {
            col.style.display = 'none';
            if (embed) {
              embed.style.transform = 'rotate(0deg)'; // Убираем поворот
            }
          } else {
            col.style.display = 'flex';
            if (embed) {
              embed.style.transform = 'rotate(180deg)'; // Поворачиваем на 180 градусов
            }
          }
        });
      }
    });
  });

  // this function needs to be available on global scope (window)
  function submitTF({ formId, responseId }) {
    // add it to user commetn and update card
    console.log(`Form ${formId} submitted, response id: ${responseId}`)
    {
      const button = document.querySelector(`button[data-tf-popup="${formId}"]`);

      if (button) {
        const container = button.closest('.ac-doc__open');
        if (container) {
          const card = container.closest('.ac-doc');
          const cardId = card.id;
          const backendCardId = cardId.match(/\d+/)[0];  // находит первое число в id
          const comment = `Form ${formId} submitted, response id: ${responseId}`;
          UpdateCardComment(backendCardId, comment);
        } else {
          console.error('Container with class .ac-doc__open not found.');
        }
      } else {
        console.error(`Button with data-tf-popup="${formId}" not found.`);
      }
    }
  };
  
  // Функция для подсчета суммы data-points
function calculatePoints() {
  let totalPoints = 0;

  // Проходим по всем элементам с классом "ac-doc"
  const acDocElements = readyContainer.querySelectorAll('.ac-doc');
  acDocElements.forEach(element => {
    const points = parseInt(element.getAttribute('data-points'), 10);
    if (!isNaN(points)) {
      totalPoints += points;
    }
  });

  return totalPoints;
};

function UpdateUserCoins(result) {
    if (userplan && userplan === 'Free registration') {
        usercoins = result;
    } else {
        usercoins = 200 + result;
    };

    // Обновляем элемент с классом "ac-points__value" на новое значение
    const pointsElement = document.querySelector('.ac-points__value');
    if (pointsElement) {
        pointsElement.textContent = usercoins;
    };
}


const pointsObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.classList && node.classList.contains('ac-doc')) {
        const result = calculatePoints();
        console.log('Total points:', result);
        UpdateUserCoins(result);
      }
    });
  });
});

const pointsConfig = { childList: true, subtree: true };
pointsObserver.observe(readyContainer, pointsConfig);

</script>
