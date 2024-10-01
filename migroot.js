class Migroot {
    constructor(config) {
        this.config = config;
        this.user = null;
        this.userplan = null;
        this.usercoins = 0;
        this.get_url = null;
        this.post_url = null;
    }

    async init_dashboard(providedUsername = null, providelinkId = null, callback = null) {
        try {
            console.log('Step 1: Clearing containers');
            this.clearContainers();

            if (!providedUsername) {
                console.log('Step 2: Fetching user');
                await this.fetchUser();
                this.userplan = this.getUserPlan();
                console.log('User fetched:', this.user, 'User plan:', this.userplan);
            }

            console.log('Step 3: Configuring URLs');
            this.configureUserUrls(providedUsername, providelinkId);
            console.log('Get URL:', this.get_url, 'Post URL:', this.post_url);

            console.log('Step 4: Fetching data');
            await this.fetchGetData(callback);
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error("Error during init dashboard:", error);
        }
    }

    updateCardUrl(id, url, filetype) {
        const cardId = `doc-${id}`;
        const data = this.createUpdateData(id, url, filetype, 'Uploaded');
        this.updateCard(data, cardId);
    }

    updateCardComment(id, comment) {
        const cardId = `doc-${id}`;
        const data = this.createUpdateData(id, null, null, 'In progress', comment);
        this.updateCard(data, cardId);
    }

    createDummyCard() {
        const dummyCard = this.config.template.cloneNode(true);
        dummyCard.id = 'dummy-card';
        dummyCard.querySelector('.ac-doc__title').textContent = 'Dummy Card';
        dummyCard.querySelector('.ac-doc__description').textContent = 'This is a placeholder card for testing purposes.';
        dummyCard.querySelector('.ac-docs__mark.ac-docs__due_date').textContent = this.formatDate(new Date().toISOString());
        dummyCard.querySelector('.ac-docs__mark.ac-docs__mark_country').textContent = 'Test Location';
        dummyCard.querySelector('.ac-docs__mark.ac-docs__applicicant').textContent = this.user ? this.user.FirstName : 'Test User';
        dummyCard.setAttribute('data-icon-status', 'test');
        dummyCard.setAttribute('data-original-status', 'Not uploaded');
        dummyCard.setAttribute('data-translate-status', 'Not uploaded');
        const readyContainer = this.getStatusContainer('Ready');
        readyContainer.insertBefore(dummyCard, readyContainer.firstChild);
    }


    clearContainers() {
        Object.values(this.config.containers).forEach(container => container.innerHTML = '');
    }

    async fetchUser() {
        try {
            this.user = await Outseta.getUser();
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    }

    async fetchGetData(callback) {
        const response = await fetch(this.get_url);
        const data = await response.json();
        data.result.forEach(item => this.createCard(item));
        if (typeof callback === 'function') await callback();
    }

    configureUserUrls(providedUsername, providelinkId) {
        const baseUrl = providelinkId ? `${this.config.webUrl}?link=${providelinkId}&user=` : `${this.config.webUrl}?user=`;
        const username = providedUsername || this.user.Email;
        this.get_url = `${baseUrl}${username}&action=getData`;
        this.post_url = `${baseUrl}${username}&action=updateData`;
    }

    createCard(item) {
        console.log('Step 5: Creating card for item:', item);

        if (!this.shouldDisplayTask(item)) {
            console.log('Task is not eligible for display, skipping');
            return;
        }

        const targetContainer = this.getStatusContainer(item.Status);
        const newCardId = `doc-${item.id}`;
        const clone = this.config.template.cloneNode(true);

        console.log('Step 6: Setting card content for card ID:', newCardId);
        this.setCardContent(clone, item);

        console.log('Step 7: Handling data attributes');
        this.handleDataAttributes(clone, item);

        console.log('Step 8: Handling comment');
        this.handleComment(clone, item);

        console.log('Step 9: Handling buttons');
        this.handleButtons(clone, item);

        console.log('Step 10: Handling file status');
        // this.handleFileStatus(clone, item);

        console.log('Step 11: Replacing existing card if needed');
        this.replaceExistingCard(newCardId, clone, targetContainer);
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
            console.error('Error updating card:', error);
            this.showLoader(cardId, false);
        });
    }


    shouldDisplayTask(item) {
        if (item.TaskType === 'task-free' && this.userplan !== 'Free registration') return false;
        if (item.TaskType === 'task-paid' && this.userplan === 'Free registration') return false;
        return true;
    }

    getStatusContainer(status) {
        return this.config.containers[status.toLowerCase().replace(' ', '')] || this.config.containers.notStarted;
    }

    setCardContent(clone, item) {
        clone.querySelector('.ac-doc__title').textContent = item.DocumentTitle;
        clone.querySelector('.ac-doc__description').textContent = item.Description;
        clone.querySelector('.ac-docs__mark.ac-docs__due_date').textContent = this.formatDate(item.DueDate);
        clone.querySelector('.ac-docs__mark.ac-docs__mark_country').textContent = item.Location;
        clone.querySelector('.ac-docs__mark.ac-docs__applicicant').textContent = item.Applicant === 'You' && this.user ? this.user.FirstName : item.Applicant;
    };

    handleDataAttributes(clone, item) {
      clone.setAttribute('data-icon-status', item.IconStatus);
      clone.setAttribute('data-original-status', item.OriginalStatus);
      clone.setAttribute('data-translate-status', item.TranslateStatus);

      clone.setAttribute('data-task-type', item.TaskType);
      clone.setAttribute('data-points', item.Points);
      clone.setAttribute('data-applicant-id', item.ApplicantID);
      clone.setAttribute('data-emotion', item.Emotion);
      }

    handleButtons(clone, item) {
        const uploadContainer = clone.querySelector('.ac-doc__action');
        if (item.ButtonLink) {
            const typeformLink = item.ButtonLink.match(/TF=(.*)/);
            uploadContainer.innerHTML = typeformLink ? this.config.buttons.openTf : this.config.buttons.openUrl;
        } else {
            uploadContainer.innerHTML = this.config.buttons.uploadFile;
        }
    };

    handleComment(clone, item) {
      if (!item.Comment || item.Comment.trim() === '') {
        clone.getElementsByClassName('ac-comment__text')[0].textContent = getRandom(MigrootStartComments);
        ;
      } else {
        clone.getElementsByClassName('ac-comment__text')[0].textContent = item.Comment;
      }
    };

    handleFileStatus(clone, item) {
        const fileStatus = clone.querySelector('.ac-doc__progress-bar');
        const originalFileBlock = clone.querySelector('.original-file-block');
        const translateFileBlock = clone.querySelector('.translate-file-block');

        if (item.OriginalStatus !== 'Not uploaded') {
            clone.querySelector('.original-link').href = item.OriginalLink;
        }
        if (item.TranslateStatus !== 'Not uploaded') {
            clone.querySelector('.translate-link').href = item.TranslateLink;
        }
        if (item.Status === 'In progress' || item.TranslateStatus === 'Verified') {
            clone.querySelector('.ac-submit.w-button').innerText = "Reload file";
        }
    }

    createUpdateData(id, url, filetype, status, userComment = 'Check my file please') {
        return {
            id,
            [`${filetype}Link`]: url,
            [`${filetype}Status`]: status,
            UserComment: userComment,
            IconStatus: 'off',
            Status: status,
            Emotion: this.getRandom(this.config.emotions),
            Comment: this.getRandom(this.config.migrootComments.review)
        };
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: this.config.timeZone });
    }

    getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    replaceExistingCard(newCardId, clone, targetContainer) {
        const oldCard = document.getElementById(newCardId);
        if (oldCard) oldCard.remove();
        clone.id = newCardId;
        targetContainer.insertBefore(clone, targetContainer.firstChild);
    }

    showLoader(cardId, show, text = 'Loading') {
        const loader = document.querySelector(`#${cardId} .ac-doc__loader`);
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
            if (show) loader.querySelector('.ac-doc__loader-text').textContent = text;
        }
    }
    getUserPlan() {
        return this.user ? this.user.SubscriptionPlan : 'Free registration';
    }
}

// // Создание объекта Migroot с конфигурацией
//const migrootInstance = new Migroot(CONFIG);

// Пример вызова метода init_dashboard
// migrootInstance.init_dashboard();
// migrootInstance.createDummyCard();
