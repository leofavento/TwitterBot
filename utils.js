const delay = (ms) => new Promise((resolve) => {
    let min = ms * 0.9;
    let max = ms * 1.3;
    let waitingTime = Math.random() * (max - min) + min;
    setTimeout(resolve, waitingTime);
});

module.exports = delay