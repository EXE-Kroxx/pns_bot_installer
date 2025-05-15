// Переопределение window.Worker для контроля активных воркеров
const OriginalWorker = window.Worker;
const activeWorkers = new Set();

window.Worker = function(scriptURL, options) {
    console.log(`Создаём воркер для: ${scriptURL}`);
    const worker = new OriginalWorker(scriptURL, options);
    activeWorkers.add(worker);
    console.log("Добавлен новый Worker:", worker);
    worker.addEventListener('message', (e) => {
        console.log("Сообщение от Worker:", e.data);
    });
    worker.addEventListener('error', (e) => {
        console.error("Ошибка в Worker:", e);
    });
    worker.terminate = (function(originalTerminate) {
        return function() {
            console.log("Worker остановлен.");
            activeWorkers.delete(worker);
            originalTerminate.call(worker);
        };
    })(worker.terminate);
    return worker;
};

// Функция для остановки всех воркеров
function stopAllWorkers() {
    for (const worker of activeWorkers) {
        worker.terminate();
    }
    console.log(("All Workers Pause...");
}

// Обработчик нажатия пробела для остановки всех воркеров
document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        console.log("Push space. Stoppid all Worker'ы...");
        stopAllWorkers();
    }
});

// Добавление события для кнопки Pause
const pauseButton = document.getElementById("pause-button"); // Убедитесь, что кнопка существует в HTML
if (pauseButton) {
    pauseButton.addEventListener('click', () => {
        console.log("Workers Pause...");
        stopAllWorkers();
    });
}

console.log("Function stoppid Worker'ов при нажатии пробела или кнопки Pause добавлена.");
