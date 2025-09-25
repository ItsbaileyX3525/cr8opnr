interface userObeject {
    gems: number,
    username: string,
    email: string,
}

export let userId: string | null
let myUserData: userObeject

//Setup dom content shit
const gemCounter = document.getElementById('gem-balance') as HTMLParagraphElement;
const signinContainer = document.getElementById('signin-container') as HTMLParagraphElement;
const registerContainer = document.getElementById('register-container') as HTMLParagraphElement;
const signoutContainer = document.getElementById('signout-container') as HTMLParagraphElement;
const usernameText = document.getElementById('username-text') as HTMLParagraphElement;
const signoutButton = document.getElementById('signout-button') as HTMLParagraphElement;

async function whoAmI(): Promise<void> {
    const res = await fetch('/api/me', {
        credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
        userId = data.userId
    }
}

async function giveMeMyFuckinData(userId: string) {
    const res = await fetch(`/api/user/${userId}`, {
        method: 'GET',
        credentials: 'include'
    });

    if (res.status === 401) {
        return;
    }
    if (res.status === 403) {
        return;
    }

    const data = await res.json();
    myUserData = data.user
}

async function loadWebsite(): Promise<void> {
    if (!myUserData) {
        return
    }
    gemCounter.innerText = String(myUserData.gems)
    usernameText.innerText = String(myUserData.username)
    signinContainer.classList.add('hidden');
    registerContainer.classList.add('hidden');
    signoutContainer.classList.remove('hidden');
}

signoutButton.addEventListener("click", () => {
    window.location.href = "/api/logout"
})

document.addEventListener("DOMContentLoaded", async () => {
    await whoAmI()
    if (userId) {
        await giveMeMyFuckinData(userId)
    }
    await loadWebsite();
})