"use strict";

var Stack = function (items = "") {
    var self = this;

    self.Items = [...items];

    self.Push = function (item) {
        self.Items.push(item);
    };

    self.Pop = function () {
        return self.Items.pop();
    };

    self.Top = function () {
        return self.Items.slice(-1)[0];
    };

    self.Full = function () {
        return self.Items.length === 4;
    };

    self.Empty = function () {
        return self.Items.length === 0;
    };

    self.MissingOne = function () {
        return self.Items.length == 3 && self.Monocolor();
    };

    self.Monocolor = function () {
        return self.Items.every(elem => elem === self.Items[0]);
    };

    self.Solved = function () {
        return self.Full() && self.Monocolor();
    };

    self.GetItems = function () {
        return self.Items;
    };

    self.ToString = function () {
        return self.Items.join("").padEnd(4, " ");
    };
};