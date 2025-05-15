// ��������������� window.Worker ��� �������� �������� ��������
const OriginalWorker = window.Worker;
const activeWorkers = new Set();

window.Worker = function(scriptURL, options) {
    console.log(`������ ������ ���: ${scriptURL}`);
    const worker = new OriginalWorker(scriptURL, options);
    activeWorkers.add(worker);
    console.log("�������� ����� Worker:", worker);
    worker.addEventListener('message', (e) => {
        console.log("��������� �� Worker:", e.data);
    });
    worker.addEventListener('error', (e) => {
        console.error("������ � Worker:", e);
    });
    worker.terminate = (function(originalTerminate) {
        return function() {
            console.log("Worker ����������.");
            activeWorkers.delete(worker);
            originalTerminate.call(worker);
        };
    })(worker.terminate);
    return worker;
};

// ������� ��� ��������� ���� ��������
function stopAllWorkers() {
    for (const worker of activeWorkers) {
        worker.terminate();
    }
    console.log(("All Workers Pause...");
}

// ���������� ������� ������� ��� ��������� ���� ��������
document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        console.log("Push space. Stoppid all Worker'�...");
        stopAllWorkers();
    }
});

// ���������� ������� ��� ������ Pause
const pauseButton = document.getElementById("pause-button"); // ���������, ��� ������ ���������� � HTML
if (pauseButton) {
    pauseButton.addEventListener('click', () => {
        console.log("Workers Pause...");
        stopAllWorkers();
    });
}

console.log("Function stoppid Worker'�� ��� ������� ������� ��� ������ Pause ���������.");
