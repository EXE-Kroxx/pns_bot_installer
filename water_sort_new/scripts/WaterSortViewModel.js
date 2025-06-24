"use strict";

var WaterSortViewModel = function (config) {
    var self = this;
    
    // Предустановленные цвета
self.PresetColors = [
    { letter: 'A', color: '#e4627c', name: 'Pink' },
    { letter: 'B', color: '#de372f', name: 'Red' },
    { letter: 'C', color: '#794d1e', name: 'Brown' },
    { letter: 'D', color: '#752037', name: 'Maroon' },
    { letter: 'E', color: '#ec8525', name: 'Orange' },
    { letter: 'F', color: '#175c23', name: 'Dark Green' },
    { letter: 'G', color: '#a3067c', name: 'Magenta' },
    { letter: 'H', color: '#41d575', name: 'Light Green' },
    { letter: 'I', color: '#473cc6', name: 'Blue' },
    { letter: 'J', color: '#5ca6e1', name: 'Light Blue' },
    { letter: 'K', color: '#8732cd', name: 'Purple' },
    { letter: 'L', color: '#d695d5', name: 'Lavender' },
    { letter: 'M', color: '#c8866e', name: 'Tan' },
    { letter: 'N', color: '#119579', name: 'Teal' },
    { letter: 'O', color: '#1d2e36', name: 'Dark Gray' },
    { letter: 'P', color: '#ff69b3', name: 'Hot Pink' },
    { letter: 'Q', color: '#4b0081', name: 'Indigo' },
    { letter: 'R', color: '#fed700', name: 'Yellow' },
    { letter: 'S', color: '#81007f', name: 'Dark Purple' },
    { letter: 'T', color: '#EE82EE', name: 'Violet' }
];


    self.CurrentEditingTube = ko.observable(null);
    self.CurrentEditingSegment = ko.observable(null);
    self.Debugging = true;
    self.Solution = ko.observableArray([]);
    self.SolutionIndex = ko.observable(0);
    self.Defaults = JSON.parse(JSON.stringify(config));
    self.Pallet = ko.observableArray([]);
    
    self.Defaults.Pallet.forEach((element, index) => {
        self.Pallet.push(new PalletModel(element[0], element[1], self));
    });

    self.Tubes = ko.observableArray([]);
    self.Defaults.Tubes.forEach((element, index) => {
        self.Tubes.push(new TubeModel(element[0], element[1], self));
    });

    // Инициализация цветовой палитры
    self.InitializeColorPicker = function() {
        const palette = document.getElementById('colorPalette');
        if (!palette) return;
        
        palette.innerHTML = '';
        
        self.PresetColors.forEach(colorData => {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'color-option';
            colorDiv.style.backgroundColor = colorData.color;
            colorDiv.title = `${colorData.name} (${colorData.letter})`;
            colorDiv.onclick = () => self.SelectColor(colorData);
            palette.appendChild(colorDiv);
        });
    };

    // Выбор цвета
self.SelectColor = function(colorData) {
    const tubeIndex = self.CurrentEditingTube();
    const segmentIndex = self.CurrentEditingSegment();
    
    // Если редактируем сегмент колбы
    if (tubeIndex !== null && segmentIndex !== null) {
        const tube = self.Tubes()[tubeIndex];
        let currentCode = tube.LetterColorCode().toUpperCase();
        
        while (currentCode.length < 4) {
            currentCode += ' ';
        }
        
        const codeArray = currentCode.split('');
        codeArray[segmentIndex] = colorData.letter;
        tube.LetterColorCode(codeArray.join('').trim());
        
        const existingColor = self.Pallet().find(p => p.Letter === colorData.letter);
        if (!existingColor) {
            self.Pallet.push(new PalletModel(colorData.letter, colorData.color, self));
        }
    }
    // Если редактируем цвет в палитре
    else if (self.CurrentEditingPaletteColor) {
        self.CurrentEditingPaletteColor.Letter = colorData.letter;
        self.CurrentEditingPaletteColor.HexColor(colorData.color);
        self.CurrentEditingPaletteColor = null;
    }
    
    $('#colorPickerModal').modal('hide');
};

    // Очистка цвета сегмента
self.ClearTubeColor = function() {
    const tubeIndex = self.CurrentEditingTube();
    const segmentIndex = self.CurrentEditingSegment();
    
    // Если редактируем сегмент колбы
    if (tubeIndex !== null && segmentIndex !== null) {
        const tube = self.Tubes()[tubeIndex];
        let currentCode = tube.LetterColorCode().toUpperCase();
        
        while (currentCode.length < 4) {
            currentCode += ' ';
        }
        
        const codeArray = currentCode.split('');
        codeArray[3 - segmentIndex] = ' ';
        tube.LetterColorCode(codeArray.join('').trim());
    }
    // Если редактируем цвет в палитре - удаляем его
    else if (self.CurrentEditingPaletteColor) {
        const index = self.Pallet().indexOf(self.CurrentEditingPaletteColor);
        if (index > -1) {
            self.Pallet.splice(index, 1);
        }
        self.CurrentEditingPaletteColor = null;
    }
    
    $('#colorPickerModal').modal('hide');
};

// Инициализируем переменную для хранения редактируемого цвета палитры
self.CurrentEditingPaletteColor = null;

    // Обработка клика по сегменту
    self.OnSegmentClick = function(tubeIndex, segmentIndex) {
        self.CurrentEditingTube(tubeIndex);
        self.CurrentEditingSegment(segmentIndex);
        self.InitializeColorPicker();
        $('#colorPickerModal').modal('show');
    };

    // Подписка на изменения труб
    self.Tubes.subscribe(function (changes) {
        self.UpdateGameDisplay();
        self.CookieDataModified(true);
        if (self.Debugging)
            console.log("change event: Tubes: " + changes.length);
    });

    self.Canvas = null;
    self.InitializedCanvas = function () {
        const width = 405;
        const height = 620;
        const canvas = document.querySelector('#canvas');
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        const scale = window.devicePixelRatio;
        canvas.width = width * scale;
        canvas.height = height * scale;
        canvas.getContext('2d').scale(scale, scale);
        return canvas;
    };

    self.UpdateGameDisplay = function () {
        if (self.IsResetting === false) {
            self.UpdatePalletCounts();
            self.Canvas = self.InitializedCanvas();
            self.GameDisplay = new GameDisplay(self.Canvas.getContext('2d'), self.Pallet().map(function (color) {
                return [color.Letter, color.HexColor()];
            }), self.Debugging);

            // Подключаем обработчик кликов
            self.GameDisplay.OnSegmentClick = self.OnSegmentClick;
            
            // Добавляем обработчик кликов на canvas
            self.Canvas.onclick = self.GameDisplay.HandleCanvasClick;

            self.GameDisplay.Draw(self.Tubes().map(function (tube) {
                return tube.LetterColorCode().toUpperCase();
            }));
        }
    };

    self.NumberOfTubes = ko.observable(self.Tubes().length);
    self.NumberOfTubes.subscribe(function (newValue) {
        var diff = newValue - self.Tubes().length;
        if (diff > 0) {
            for (var i = 0; i < diff; i++) {
                self.Tubes.push(new TubeModel(self.Tubes().length + 1, "", self));
            }
        } else if (diff < 0) {
            for (var i = diff; i < 0; i++) {
                self.Tubes.pop();
            }
        }
    });

    self.IsResetting = false;
    self.CookieDataModified = ko.observable(false);

    self.Clear = function () {
        self.Tubes().forEach((element, index) => {
            element.LetterColorCode('');
        });
    };

    self.Reset = function () {
        self.IsResetting = true;
        self.Pallet([]);
        self.Defaults.Pallet.forEach((element, index) => {
            self.Pallet.push(new PalletModel(element[0], element[1], self));
        });
        self.Tubes([]);
        self.NumberOfTubes(0);
        self.Defaults.Tubes.forEach((element, index) => {
            self.Tubes.push(new TubeModel(element[0], element[1], self));
        });
        self.NumberOfTubes(self.Tubes().length);
        self.UpdateOnChangeEvents();
        self.Solution([])
        self.SolutionIndex(0);
        self.DisplayMessage("");
        self.OutputWindow("");
        self.IsResetting = false;
        self.UpdateGameDisplay();
    };

    self.GetCookieData = function() {
        return Cookies.get("WaterSortConfiguration");
    };

    self.SetCookieData = function() {
        let t = [];
        self.Tubes().forEach((tube, index) => {
            t.push([tube.Index, tube.LetterColorCode().toUpperCase()]);
        });

        let p = [];
        self.Pallet().forEach((swatch, index) => {
            p.push([swatch.Letter, swatch.HexColor()]);
        });

        let config = JSON.stringify({"Tubes": t, "Pallet": p});
        Cookies.set("WaterSortConfiguration", config, { expires: 1, path: '' });
        self.CookieDataModified(false);
        self.HasCookieData.notifySubscribers();
    };

    self.HasCookieData = ko.pureComputed(function () {
        if (self.GetCookieData()) {
            return true;
        }
        return false;
    }, self);

    self.ResetWithCookie = function () {
        self.IsResetting = true;
        let cookie = JSON.parse(self.GetCookieData());
        self.Pallet([]);
        cookie.Pallet.forEach((element, index) => {
            self.Pallet.push(new PalletModel(element[0], element[1], self));
        });
        self.Tubes([]);
        self.NumberOfTubes(0);
        cookie.Tubes.forEach((element, index) => {
            self.Tubes.push(new TubeModel(element[0], element[1], self));
        });
        self.NumberOfTubes(self.Tubes().length);
        self.UpdateOnChangeEvents();
        self.Solution([])
        self.SolutionIndex(0);
        self.DisplayMessage("");
        self.OutputWindow("");
        self.IsResetting = false;
        self.UpdateGameDisplay();
    };

    self.UpdateOnChangeEvents = function () {
        $(".selector-tube").each(function (key, tube) {
            $(tube).css("background-color", tube.value);
            $(tube).change(function (tube) {
                $(tube.currentTarget).css("background-color", tube.currentTarget.value);
            });
        });
    };

    self.UpdatePalletCounts = function () {
        for (let idx = 0; idx < self.Pallet().length; idx++) {
            self.Pallet()[idx].Counter(0);
        }

        self.Tubes().forEach((tube, index) => {
            tube.LetterColorCode().toUpperCase().split('').forEach((letter, index) => {
                for (let idx = 0; idx < self.Pallet().length; idx++) {
                    if (self.Pallet()[idx].Letter == letter.toUpperCase()) {
                        self.Pallet()[idx].Counter(self.Pallet()[idx].Counter() + 1);
                    }
                }
            });
        });
    };

    self.SolutionLabel = ko.pureComputed(function () {
        var result = ""
        if (self.Solution().length > 0) {
            return (self.SolutionIndex() + 1) + ' of ' + self.Solution().length;
        }
        return result;
    }, self);

    self.Solve = function () {
        const state = new GameState(self.Tubes().map(function (tube) {
            return tube.LetterColorCode().toUpperCase();
        }));
        const solution = state.Solve(state);
        if (solution.length === 0) {
            self.DisplaySnackbar("Решение не найдено.", "danger");
        } else {
            self.Solution(solution);
            self.SolutionIndex(0);
            self.DisplaySnackbar("Решение найдено, пожалуйста, используйте Вперед и Назад для просмотра решения.", "success");
        }
        self.OutputWindow("");
    };

    self.CanSolve = ko.pureComputed(function () {
        var result = true;
        for (let idx = 0; idx < self.Pallet().length; idx++) {
            if (self.Pallet()[idx].Counter() != 4 && self.Pallet()[idx].Counter() != 0) {
                result = false;
                break;
            }
        }
        return result;
    }, self);

    self.IsSolved = ko.pureComputed(function () {
        return (self.Solution().length > 0);
    }, self);

    self.SolvedLabel = ko.pureComputed(function () {
        return self.IsSolved() ? "Решено" : "Решить";
    }, self);

    self.Step = function () {
        var indx = self.SolutionIndex();
        var left = self.Solution()[self.SolutionIndex()];
        self.SolutionIndex(++indx);
        var right = self.Solution()[self.SolutionIndex()];
        self.GameDisplay.Draw(right);
        if (self.Debugging) {
            console.log(self.DiffGram(left, right));
        }
        self.WriteToOutputWindow(self.DiffGram(left, right), "step");
    };

    self.CanStep = ko.pureComputed(function () {
        return ((self.Solution().length - 1) > self.SolutionIndex());
    }, self);

    self.Back = function () {
        var indx = self.SolutionIndex();
        var left = self.Solution()[self.SolutionIndex()];
        self.SolutionIndex(--indx);
        var right = self.Solution()[self.SolutionIndex()];
        self.GameDisplay.Draw(right);
        if (self.Debugging) {
            console.log(self.DiffGram(left, right));
        }
        self.WriteToOutputWindow(self.DiffGram(left, right), "back");
    };

    self.CanBack = ko.pureComputed(function () {
        return (self.SolutionIndex() > 0 && self.Solution().length > 0);
    }, self);

    self.DisplaySnackbar = function (message, tag) {
        var animationTime = 3000;
        var bar = document.getElementById("snackbar");
        self.DisplayTag(tag)
        self.DisplayMessage(message);
        if (tag == "success") {
            self.DisplayTagLine("Отлично!");
        } else {
            self.DisplayTagLine("Ошибка!");
        }
        $('#snackbar').fadeIn(500).delay(animationTime).fadeOut(500);
    };

    self.DisplayTag = ko.observable("");
    self.DisplayTagLine = ko.observable("");
    self.DisplayMessage = ko.observable("");
    self.ToastClasses = ko.pureComputed(function () {
        return (self.DisplayTag() == "success")
            ? "alert alert-success toast-bottom"
            : "alert alert-danger toast-bottom";
    }, self);

    self.WriteToOutputWindow = function (diff, action) {
        var left = diff.find((gram) => gram.action == "-").index + 1;
        var right = diff.find((gram) => gram.action == "+").index + 1;
        var color = self.Pallet().find((color) => color.Letter == diff.find((gram) => gram.action == "+").value.split('').pop()).HexColor();
        var message = self.OutputWindow();
        message += self.SolutionLabel() + "-> tube:" + left + " moved:" + ntc.name(color)[1] + " to tube:" + right;
        var messages = message.split('\n');
        if (messages.length > 4) {
            message = "";
            messages.forEach((msg, index) => {
                if (index > 0)
                    message += msg + '\n'
            });
            self.OutputWindow(message);
        } else {
            self.OutputWindow(message + '\n');
        }
    };

    self.OutputWindow = ko.observable("");

    function IsEqual(left, right) {
        return JSON.stringify(left) === JSON.stringify(right);
    }

    self.DiffGram = function (left, right) {
        let result = [];
        for (let i = 0; i < left.length; i++) {
            if (!IsEqual(left[i], right[i])) {
                if (right[i].length > left[i].length) {
                    result.push({ action: "+", index: i, value: right[i] });
                } else {
                    result.push({ action: "-", index: i, value: right[i] });
                }
            }
        }
        return result;
    };

    self.UpdateOnChangeEvents();
    self.UpdateGameDisplay();
};
