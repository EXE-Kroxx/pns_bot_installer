"use strict";

var WaterSortViewModel = function (config) {
    var self = this;

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
    self.Tubes.subscribe(function (changes) {
        self.UpdateGameDisplay();
        self.CookieDataModified(true);
        if (self.Debugging)
            console.log("change event: Tubes: " + changes.length);
    });

    self.Canvas = null;
    self.InitializedCanvas = function () {
        const width = 435;
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

    self.Clear = function () {
        self.Tubes().forEach((element, index) => {
            element.LetterColorCode('');
        });
    }

    self.IsResetting = false;
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

    self.CookieDataModified = ko.observable(false);
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

    // A function that returns a diff gram of two arrays
    self.DiffGram = function (left, right) {
        let result = [];
        // Loop through the first array
        for (let i = 0; i < left.length; i++) {
            // Compare each element with the second array
            if (!IsEqual(left[i], right[i])) {
                if (right[i].length > left[i].length) {
                    result.push({ action: "+", index: i, value: right[i] });
                } else {
                    result.push({ action: "-", index: i, value: right[i] });
                }
            }
        }
        return result;
    }

    self.UpdateOnChangeEvents();
    self.UpdateGameDisplay();
};
