interface userObeject {
    gems: number
}

let userId: string
let myUserData: userObeject

//Setup dom content shit
const gemCounter = document.getElementById('gem-balance') as HTMLParagraphElement;

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
}

document.addEventListener("DOMContentLoaded", async () => {
    await whoAmI()
    await giveMeMyFuckinData(userId)
    await loadWebsite();
})