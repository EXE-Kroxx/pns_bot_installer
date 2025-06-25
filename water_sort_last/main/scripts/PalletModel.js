"use strict";

var PalletModel = function (letter, hexColor, parent) {
    var self = this;
    self.Letter = letter;
    self.HexColor = ko.observable(hexColor);
    self.Counter = ko.observable(0);
    self.Parent = parent;

    // Добавляем обработчик клика
    self.OnClick = function() {
        if (self.Parent && self.Parent.OnPaletteColorClick) {
            self.Parent.OnPaletteColorClick(self);
        }
    };

    self.HexColor.subscribe(function (newValue) {
        self.Parent.UpdateGameDisplay();
        self.Parent.CookieDataModified(true);
    });
};
