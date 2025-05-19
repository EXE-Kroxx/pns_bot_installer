"use strict";

var GameState = function (array) {
    var self = this;

    self.Stacks = [];
    for (const stack of array) {
        self.Stacks.push(new Stack(stack));
    };

    self.DeepCopy = function () {
        const stacks = [];
        for (const stack of self.Stacks) {
            stacks.push(stack.GetItems());
        }
        return new GameState(stacks);
    };

    self.Solved = function () {
        return self.Stacks.every(s => s.Solved() || s.Empty());
    };

    self.IsLegalMove = function (orig, dest) {
        if (orig === dest) return false;
        if (self.Stacks[dest].Full()) return false;
        if (self.Stacks[orig].Empty() || self.Stacks[orig].Solved()) return false;
        if (self.Stacks[dest].Empty()) {
            // Not illegal, but moving monocolor stack into empty makes no progress.
            return self.Stacks[orig].Monocolor() ? false : true;
        }
        // Not illegal, but moving monocolor 3-stack makes no progress.
        if (self.Stacks[orig].MissingOne()) return false;
        if (self.Stacks[orig].Top() !== self.Stacks[dest].Top()) return false;
        return true;
    };

    self.GetLegalMoves = function () {
        const legal_moves = []; // [from, to]
        for (let orig = 0; orig < self.Stacks.length; orig++) {
            for (let dest = 0; dest < self.Stacks.length; dest++) {
                if (self.IsLegalMove(orig, dest)) {
                    legal_moves.push([orig, dest]);
                }
            }
        }
        return legal_moves;
    };

    self.Move = function (orig, dest) {
        while (self.IsLegalMove(orig, dest)) {
            self.Stacks[dest].Push(self.Stacks[orig].Pop());
        }
    };

    self.GetKey = function () {
        return self.StacksToKey(self.Stacks);
    };

    self.StacksToKey = function (stacks) {
        const key = [];
        for (const stack of stacks) {
            key.push(stack.ToString());
        }
        return key.join("|");
    };

    self.KeyToStacks = function (key) {
        const stacks = [];
        for (const split of key.split("|")) {
            stacks.push(split.trim());
        }
        return stacks;
    };

    self.Solve = function (initial_state) {
        // TODO: Implement a more optimal algorithm than depth-first-search.
        const stack = [initial_state];
        const visited = new Set([initial_state]);
        const parent = new Map();
        while (stack.length > 0) {
            let current_state = stack.pop();
            if (current_state.Solved()) {
                let current_key = current_state.GetKey();
                const steps = [self.KeyToStacks(current_key)];
                while (current_key !== initial_state.GetKey()) {
                    steps.push(self.KeyToStacks(parent[current_key]));
                    current_key = parent[current_key];
                }
                return steps.reverse();
            }
            for (const move of current_state.GetLegalMoves()) {
                const new_state = current_state.DeepCopy();
                new_state.Move(move[0], move[1]);
                if (!visited.has(new_state.GetKey())) {
                    stack.push(new_state);
                    parent[new_state.GetKey()] = current_state.GetKey();
                    visited.add(new_state.GetKey());
                }
            }
        }
        return [];
    };
};
