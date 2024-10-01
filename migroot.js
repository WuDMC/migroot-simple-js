class Logger {
    constructor(debug = false) {
        this.debug = debug;
    }

    _getCurrentTime() {
        const now = new Date();
        const timeString = now.toISOString().slice(11, 23); 
        return timeString;
    }

    _log(message, vars = null, type = 'info') {
        const styles = {
            info: 'color: blue; font-weight: bold;',
            warning: 'color: orange; font-weight: bold;',
            error: 'color: red; font-weight: bold;'
        };

        const logType = type.toLowerCase();
        const timestamp = this._getCurrentTime();

        if (styles[logType]) {
            console.log(`%c[${timestamp}] [${logType.toUpperCase()}]: ${message}`, styles[logType], vars);
        } else {
            console.log(`[${timestamp}] [LOGGER]: ${message}`, vars);
        }
    }

    info(message, vars) {
        if (this.debug) {
            this._log(message, vars, 'info');
        }
    }

    warning(message, vars) {
        this._log(message, vars, 'warning');
    }

    error(message, vars) {
        this._log(message, vars, 'error');
    }
}


// const CONFIG = {
//     user: {
        // fullName: 'Denis Mironov',
        // firstName: 'Denis',
        // plan: 'Free registration',
        // email: 'denis.mironov.personal@gmail.com',
        // linkId: null
        // },
//     template: document.getElementById('doc-template'),
//     buttons: {
//         uploadFile: document.getElementById('upload_file').innerHTML,
//         openTf: document.getElementById('open_tf').innerHTML,
//         openUrl: document.getElementById('open_url').innerHTML,
//         submitUrl: document.getElementById('submit_url').innerHTML
//     },
//     containers: {
//         ready: document.getElementById('ready'),
//         inProgress: document.getElementById('in-progress'),
//         notStarted: document.getElementById('not-started')
//     },
//     webUrl: 'https://script.google.com/macros/s/AKfycbxLRZANt4ayb0x_IRClCEw6cjA5s7b2Iv6v4sjNMmNbL1WMsNTx32eK1q8zw4CHVOJq0Q/exec',
//     emotions: ["normal", "smile", "surprise"],
//     migrootComments: {
//         review: ["Wait for checking", "So-o-o-on please wait", "Okay, let's see!"],
//         start: ["Every document tells a story.", "Efficiency is key in document management.", "Timely action is critical to success."]
//     },
//     timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
// };

class Migroot {
    constructor(config) {
        this.config = config;
        this.cards = null;
        this.get_url = null;
        this.post_url = null;
        this.log = new Logger(this.config.debug);
    }

    async init_dashboard(callback = null) {
        try {
            this.log.info('Step 1: Clearing containers');
            this.#clearContainers();

            this.log.info('Step 2: Configuring URLs');
            this.#configureUserUrls();
            this.log.info(`Get URL:  ${this.get_url} Post URL: ${this.post_url}`);

            this.log.info('Step 3: Fetching data from backend');
            await this.#fetchGetData();
            this.log.info('Dashboard initialized successfully');
            if (callback && typeof callback === 'function') {
                this.log.info('callback called');
                callback(); // Можно передать сюда аргументы, если нужно
            }
        } catch (error) {
            this.log.error(`Error during init dashboard: ${error.message}`);
        }
    };

    createCard(item) {
        this.log.info(`Step 5: Creating card for item: ${item}`);
        if (!this.#shouldDisplayTask(item)) {
            this.log.info('Task is not eligible for display, skipping');
            return;
        }
        const targetContainer = this.#getStatusContainer(item.Status);
        const newCardId = `doc-${item.id}`;
        const clone = this.config.template.cloneNode(true);

        this.log.info(`Step 6: Setting card content for card ID: ${newCardId}`);
        this.#setCardContent(clone, item);

        this.log.info('Step 7: Handling data attributes');
        this.#handleDataAttributes(clone, item);

        this.log.info('Step 8: Handling comment');
        this.#handleComment(clone, item);

        this.log.info('Step 9: Handling buttons');
        this.#handleButtons(clone, item);

        this.log.info('Step 10: Handling file status');
        this.#handleFileStatus(clone, item);

        this.log.info('Step 11: Replacing existing card if needed');
        this.#replaceExistingCard(newCardId, clone, targetContainer);
    }

    updateCard(data, cardId) {
        fetch(this.post_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => this.createCard(data.result.updatedData))
        .catch(error => {
            this.log.error(`Error updating card: ${error.message}`);
            this.#showLoader(cardId, false);
        });
    }

    updateCardUrl(id, url, filetype) {
        const cardId = `doc-${id}`;
        const data = this.#createUpdateData(id, url, filetype, 'Uploaded');
        this.updateCard(data, cardId);
    }

    updateCardComment(id, comment) {
        const cardId = `doc-${id}`;
        const data = this.#createUpdateData(id, null, null, 'In progress', comment);
        this.updateCard(data, cardId);
    }

    createDummyCard() {
        const dummyCard = this.config.template.cloneNode(true);
        dummyCard.id = 'dummy-card';
        dummyCard.querySelector('.ac-doc__title').textContent = 'Dummy Card';
        dummyCard.querySelector('.ac-doc__description').textContent = 'This is a placeholder card for testing purposes.';
        dummyCard.querySelector('.ac-docs__mark.ac-docs__due_date').textContent = this.#formatDate(new Date().toISOString());
        dummyCard.querySelector('.ac-docs__mark.ac-docs__mark_country').textContent = 'Test Location';
        dummyCard.querySelector('.ac-docs__mark.ac-docs__applicicant').textContent = 'Test User';
        dummyCard.setAttribute('data-icon-status', 'test');
        dummyCard.setAttribute('data-original-status', 'Not uploaded');
        dummyCard.setAttribute('data-translate-status', 'Not uploaded');
        const readyContainer = this.#getStatusContainer('Ready');
        readyContainer.insertBefore(dummyCard, readyContainer.firstChild);
    }


    #clearContainers() {
        Object.values(this.config.containers).forEach(container => container.innerHTML = '');
    }


    async #fetchGetData() {
        const response = await fetch(this.get_url);
        const data = await response.json();
        this.cards = data.result;
        data.result.forEach(item => this.createCard(item));
    }

    #configureUserUrls() {
        const baseUrl = this.config.user.linkId ? `${this.config.webUrl}?link=${this.config.user.linkId}&user=` : `${this.config.webUrl}?user=`;
        const username = this.config.user.email;
        this.get_url = `${baseUrl}${username}&action=getData`;
        this.post_url = `${baseUrl}${username}&action=updateData`;
    };


    #shouldDisplayTask(item) {
        if (item.TaskType === 'task-free' && this.config.user.plan !== 'Free registration') return false;
        if (item.TaskType === 'task-paid' && this.config.user.plan === 'Free registration') return false;
        return true;
    }

    #getStatusContainer(status) {
            switch (status) {
              case 'Not started':
                return this.config.containers.notStarted;
              case 'In progress':
                return this.config.containers.inProgress;
              case 'Ready':
                return this.config.containers.ready;
              default:
                this.log.error(`Unknown status: ${status}`);
                return this.config.containers.notStarted;
            }
          }

    #setCardContent(clone, item) {
        clone.querySelector('.ac-doc__title').textContent = item.DocumentTitle;
        clone.querySelector('.ac-doc__description').textContent = item.Description;
        clone.querySelector('.ac-docs__mark.ac-docs__due_date').textContent = this.#formatDate(item.DueDate);
        clone.querySelector('.ac-docs__mark.ac-docs__mark_country').textContent = item.Location;
        clone.querySelector('.ac-docs__mark.ac-docs__applicicant').textContent = item.Applicant === 'You' && this.config.user ? this.config.user.firstName : item.Applicant;
    };

    #handleDataAttributes(clone, item) {
      clone.setAttribute('data-icon-status', item.IconStatus);
      clone.setAttribute('data-original-status', item.OriginalStatus);
      clone.setAttribute('data-translate-status', item.TranslateStatus);
      clone.setAttribute('data-task-type', item.TaskType);
      clone.setAttribute('data-points', item.Points);
      clone.setAttribute('data-applicant-id', item.ApplicantID);
      clone.setAttribute('data-emotion', item.Emotion);
      }

    #handleButtons(clone, item) {
        const uploadContainer = clone.querySelector('.ac-doc__action');
        if (item.ButtonLink) {
            const typeformLink = item.ButtonLink.match(/TF=(.*)/);
            uploadContainer.innerHTML = typeformLink ? this.config.buttons.openTf : this.config.buttons.openUrl;
        } else {
            uploadContainer.innerHTML = this.config.buttons.uploadFile;
        }
    };

    #handleComment(clone, item) {
      if (!item.Comment || item.Comment.trim() === '') {
        clone.getElementsByClassName('ac-comment__text')[0].textContent = getRandom(MigrootStartComments);
        ;
      } else {
        clone.getElementsByClassName('ac-comment__text')[0].textContent = item.Comment;
      }
    };

    #handleFileStatus(clone, item) {
        const filesProgressBlock = clone.querySelector('.ac-doc__progress-bar');
        const originalFileBlock = clone.querySelector('.original-file-block');
        const translateFileBlock = clone.querySelector('.translate-file-block');
        const uploadContainer = clone.querySelector('.ac-doc__action');
        const originalLink = clone.querySelector('.original-link');
        const translateLink = clone.querySelector('.translate-link');
        var button;
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
            this.log.info(item);
            console.log(item);
            this.log.info(clone);
            console.log(clone);
        	button = uploadContainer.querySelector('.ac-submit.w-button');
            this.log.info(button);
            console.log(button);
            if (button) button.innerText = "Reload file"
        };
        
        
        
        if (item.OriginalStatus === 'Not needed') {
          if (filesProgressBlock) filesProgressBlock.remove();
        } else if (item.TranslateStatus === 'Not needed') {
          if (translateFileBlock) translateFileBlock.remove();
        };
    };

    #createUpdateData(id, url, filetype, status, userComment = 'Check my file please') {
        return {
            id,
            [`${filetype}Link`]: url,
            [`${filetype}Status`]: status,
            UserComment: userComment,
            IconStatus: 'off',
            Status: status,
            Emotion: this.#getRandom(this.config.emotions),
            Comment: this.#getRandom(this.config.migrootComments.review)
        };
    }

    #formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: this.config.timeZone });
    }

    #getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    #replaceExistingCard(newCardId, clone, targetContainer) {
        const oldCard = document.getElementById(newCardId);
        if (oldCard) oldCard.remove();
        clone.id = newCardId;
        targetContainer.insertBefore(clone, targetContainer.firstChild);
    }

    #showLoader(cardId, show, text = 'Loading') {
        const loader = document.querySelector(`#${cardId} .ac-doc__loader`);
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
            if (show) loader.querySelector('.ac-doc__loader-text').textContent = text;
        }
    }
    #getUserPlan() {
        return this.config.user ? this.config.user.plan : 'Free registration';
    }
}

// // Создание объекта Migroot с конфигурацией
//const migrootInstance = new Migroot(CONFIG);

// Пример вызова метода init_dashboard
// migrootInstance.init_dashboard();
// migrootInstance.createDummyCard();
