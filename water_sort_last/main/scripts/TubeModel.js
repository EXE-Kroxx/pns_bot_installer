"use strict";

var TubeModel = function (index, code, viewmodel) {
    var self = this;

    self.Parent = viewmodel;
    self.Index = index;
    self.LetterColorCode = ko.observable(code);
    self.LetterColorCode.subscribe(function (changes) {
        self.Parent.UpdateGameDisplay();
        self.Parent.CookieDataModified(true);
        if (self.Parent.Debugging)
            console.log("change event: " + self.Index + " LetterColorCode:" + changes.toUpperCase());
    });
};