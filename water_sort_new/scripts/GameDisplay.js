"use strict";

var GameDisplay = function (context, pallet, debugging) {
    var self = this;
    self.BackgroudColor = 'rgba(100, 100, 100, 1)';
    self.Debugging = debugging;
    self.Context = context;
    self.Context.font = "24px Arial";
    self.Context.fillStyle = self.BackgroudColor;
    self.Context.fillRect(0, 0, self.Context.canvas.width, self.Context.canvas.height);
    self.Context.strokeStyle = 'rgba(210, 210, 210, 1)';
    self.Context.lineWidth = 3;
    self.TubeDimensions = [];
    self.Pallet = new Map(pallet);
    self.Pallet.set('', self.BackgroudColor);
    self.Pallet.set(' ', self.BackgroudColor);
    self.ClickAreas = [];
    self.OnSegmentClick = null;

    self.Draw = function (stacks_to_draw) {
        if (self.Debugging)
            console.log("starting drawing...");
        
        // Очищаем области кликов
        self.ClickAreas = [];
        
        self.Context.fillStyle = self.BackgroudColor;
        self.Context.fillRect(0, 0, self.Context.canvas.width, self.Context.canvas.height);

        const stacks = [];
        for (const stack of stacks_to_draw) {
            stacks.push([...stack.padEnd(4).toUpperCase()]);
        }

        self.TubeDimensions = self.GetVialDimensions(stacks.length);

        for (const [i, dims] of self.TubeDimensions.entries()) {
            const [x, y, width, height] = dims;
            const colors = [];
            for (let j = 0; j < stacks[i].length; j++) {
                colors.push(self.Pallet.get(stacks[i][j]) || '#e0e0e0');
            }

            self.DrawTube(x, y, width, height);
            self.DrawTubeNumber((i+1), x, y, width, height, 'rgba(255, 255, 255, 1)');
            self.FillSegments(x, y, width, height, colors, i);
        }

        if (self.Debugging)
            console.log("finished drawing...");
    };

    self.DrawTube = function (x, y, width, height) {
        self.Context.beginPath();
        self.Context.moveTo(x, y);
        self.Context.lineTo(x + width, y);
        self.Context.lineTo(x + width, y + height);
        self.Context.arc(x + width / 2, y + height, width / 2, 0, Math.PI, false);
        self.Context.closePath();
        self.Context.stroke();
    };

    self.DrawTubeNumber = function (number, x, y, width, height, color) {
        var originalFillStyle = self.Context.fillStyle;
        self.Context.fillStyle = color;
        var textWidth = self.Context.measureText(number).width;
        self.Context.fillText(number, (x + ((width - textWidth) / 2)), y - 1);
        self.Context.fillStyle = originalFillStyle;
    };

    self.FillSegments = function (x, y, width, height, colors, tubeIndex) {
        const dy = height / 8;
        const pad = self.Context.lineWidth / 2;
        const x1 = x + pad;
        const x2 = x + width - pad;

        self.FillTubeSegmentRect(x1, y + 1 * dy, x2, y + 3 * dy, colors[3], tubeIndex, 3);
        self.FillTubeSegmentRect(x1, y + 3 * dy, x2, y + 5 * dy, colors[2], tubeIndex, 2);
        self.FillTubeSegmentRect(x1, y + 5 * dy, x2, y + 7 * dy, colors[1], tubeIndex, 1);
        self.FillTubeSegmentBottom(x1, y + 7 * dy, x2, y + 8 * dy, colors[0], tubeIndex, 0);
    };

    self.FillTubeSegmentRect = function (x1, y1, x2, y2, color, tubeIndex, segmentIndex) {
        self.Context.beginPath();
        self.Context.moveTo(x1, y1);
        self.Context.lineTo(x2, y1);
        self.Context.lineTo(x2, y2);
        self.Context.lineTo(x1, y2);
        self.Context.closePath();
        
        const finalColor = color || '#e0e0e0';
        self.Context.fillStyle = finalColor;
        self.Context.fill();

        // Сохраняем область для обработки кликов - все сегменты кликабельны
        self.ClickAreas.push({
            x1, y1, x2, y2,
            tubeIndex,
            segmentIndex,
            currentColor: finalColor
        });
    };

    self.FillTubeSegmentBottom = function (x1, y1, x2, y2, color, tubeIndex, segmentIndex) {
        self.Context.beginPath();
        self.Context.moveTo(x1, y1);
        self.Context.lineTo(x1, y2);
        const radius = (x2 - x1) / 2;
        self.Context.arc((x2 + x1) / 2, y2, radius, Math.PI, 0, true);
        self.Context.lineTo(x2, y2);
        self.Context.lineTo(x2, y1);
        self.Context.closePath();
        
        const finalColor = color || '#e0e0e0';
        self.Context.fillStyle = finalColor;
        self.Context.fill();

        // Сохраняем область для обработки кликов - все сегменты кликабельны
        self.ClickAreas.push({
            x1, y1, x2, y2,
            tubeIndex,
            segmentIndex,
            currentColor: finalColor
        });
    };

self.HandleCanvasClick = function(event) {
    event.preventDefault(); 
    const rect = self.Context.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.type === 'touchstart' || event.type === 'touchend') {
        const touch = event.touches[0] || event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    // --- НАЧАЛО ИЗМЕНЕНИЙ ---

    // 1. Получаем реальные размеры Canvas из CSS и его внутреннее разрешение
    const cssWidth = self.Context.canvas.clientWidth;
    const cssHeight = self.Context.canvas.clientHeight;
    const canvasWidth = self.Context.canvas.width;
    const canvasHeight = self.Context.canvas.height;
    
    // 2. Вычисляем коэффициенты масштабирования
    const scaleX = canvasWidth / cssWidth;
    const scaleY = canvasHeight / cssHeight;

    // 3. Масштабируем координаты клика, чтобы они соответствовали внутренней системе координат
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    if (self.ClickAreas) {
        for (let area of self.ClickAreas) {
            // 4. Используем отмасштабированные координаты для проверки попадания
            // Старый код с 'offset' и 'adjustedX' полностью удаляем
            if (x >= area.x1 && x <= area.x2 && y >= area.y1 && y <= area.y2) {
                if (self.OnSegmentClick) {
                    self.OnSegmentClick(area.tubeIndex, area.segmentIndex);
                }
                break;
            }
        }
    }
};




    self.GetVialDimensions = function (numStacks) {
        const dimsArray = [];
        const radius = 20;
        const height = radius * 7;
        const x0 = 50;
        const y0 = 40;
        const spacing = 3 * radius;
        const gap = radius * 2;
        var counter = 0, row = 0, column = 0;

        while (counter < numStacks) {
            dimsArray.push([x0 + column++ * spacing, y0 + ((height + radius + gap) * row), 2 * radius, height]);
            counter++;
            if (counter % 6 === 0) {
                column = 0;
                row++;
            }
        }
        return dimsArray;
    };
};
