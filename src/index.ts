const buyCaseButton = document.getElementById('buy-case') as HTMLButtonElement;
const steamKeysButton = document.getElementById('steam-keys') as HTMLButtonElement;
const discountedCasesButton = document.getElementById('discount-case') as HTMLButtonElement;
const shopButton = document.getElementById('open-shop') as HTMLButtonElement;
const errorMessage = document.getElementById("error-screen") as HTMLDivElement;
const closeError = document.getElementById('close-error') as HTMLParagraphElement;

function displayError(): void {
    errorMessage.classList.remove("hidden");
}

function hideError(): void {
    errorMessage.classList.add("hidden");
}

buyCaseButton.addEventListener('click', displayError);
shopButton.addEventListener('click', displayError);
steamKeysButton.addEventListener('click', displayError);
discountedCasesButton.addEventListener('click', displayError)
closeError.addEventListener("click", hideError);