"use strict";

var PalletModel = function (letter, color, viewmodel) {
    var self = this;

    self.Parent = viewmodel;
    self.Letter = letter;
    self.HexColor = ko.observable(color);
    self.HexColor.subscribe(function (changes) {
        self.Parent.UpdateGameDisplay();
        self.Parent.CookieDataModified(true);
        if (self.Parent.Debugging)
            console.log("change event: " + self.Letter + " HexColor:" + changes);
    });
    self.Counter = ko.observable(0);
    self.BadgeColor = ko.computed(function () {
        if (self.Counter() > 4) {
            return 'rgba(255, 0, 0, 0.1)';
        } else if (0 < self.Counter() && self.Counter() < 4) {
            return 'rgba(255, 215, 0, 0.1)';
        } else if (self.Counter() == 4) {
            return 'rgba(0, 255, 0, 0.1)';
        } else {
            return '';
        }
    });
};