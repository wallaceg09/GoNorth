(function(GoNorth) {
    "use strict";
    (function(Task) {
        (function(ManageBoards) {

            /**
             * Manage Boards View Model
             * @class
             */
            ManageBoards.ViewModel = function()
            {
                this.isLoading = new ko.observable(false);

                this.errorOccured = new ko.observable(false);
                this.additionalErrorDetails = new ko.observable("");

                this.openBoardList = new ManageBoards.TaskBoardList(GoNorth.Task.ManageBoards.Localization.OpenTaskBoards, "glyphicon-ok", GoNorth.Task.ManageBoards.Localization.CloseTaskBoardToolTip, "GetOpenTaskBoards", true, this.errorOccured);
                this.closedBoardList = new ManageBoards.TaskBoardList(GoNorth.Task.ManageBoards.Localization.ClosedTaskBoards, "glyphicon-repeat", GoNorth.Task.ManageBoards.Localization.ReopenTaskBoardToolTip, "GetClosedTaskBoards", false, this.errorOccured);

                this.showBoardCreateEditDialog = new ko.observable(false);
                this.showDateValidationError = new ko.observable(false);
                this.isEditingBoard = new ko.observable(false);
                this.createEditBoardName = new ko.observable("");
                this.createEditBoardPlannedStart = new ko.observable(null);
                this.createEditBoardPlannedEnd = new ko.observable(null);
                this.editingBoard = null;

                this.showConfirmDeleteDialog = new ko.observable(false);
                this.deleteBoardId = null;

                this.showConfirmToogleStatusDialog = new ko.observable(false);
                this.isToogleStatusClosing = new ko.observable(false);
                this.toogleStatusBoardId = null;

                this.openBoardList.loadBoards();
                this.closedBoardList.loadBoards();
            };

            ManageBoards.ViewModel.prototype = {

                /**
                 * Resets the error state
                 */
                resetErrorState: function() {
                    this.errorOccured(false);
                    this.additionalErrorDetails("");
                },


                /**
                 * Builds the url for a board
                 * 
                 * @param {object} board Board to open
                 * @returns {string} Url for the board
                 */
                buildTaskBoardUrl: function(board) {
                    return "/Task#id=" + board.id;
                },


                /**
                 * Opens the new board dialog
                 */
                openNewBoardDialog: function() {
                    this.isEditingBoard(false);
                    this.createEditBoardName("");
                    this.createEditBoardPlannedStart(null);
                    this.createEditBoardPlannedEnd(null);
                    this.editingBoard = null;
                    
                    this.openBoardDialogShared();
                },

                /**
                 * Opens the edit board dialog
                 * 
                 * @param {object} board Board to edit
                 */
                openEditBoardDialog: function(board) {
                    this.isEditingBoard(true);
                    this.createEditBoardName(board.name);
                    this.createEditBoardPlannedStart(board.plannedStart ? board.plannedStart : null);
                    this.createEditBoardPlannedEnd(board.plannedEnd ? board.plannedEnd : null);
                    this.editingBoard = board;
                    
                    this.openBoardDialogShared();
                },

                /**
                 * Opens the board dialog and sets up shared values for editing and creating
                 */
                openBoardDialogShared: function() {
                    this.showBoardCreateEditDialog(true);
                    this.showDateValidationError(false);
                    GoNorth.Util.setupValidation("#gn-taskBoardCreateEditForm");
                },

                /**
                 * Saves the board
                 */
                saveBoard: function() {
                    // Valdiate Data
                    if(!jQuery("#gn-taskBoardCreateEditForm").valid())
                    {
                        return;
                    }

                    if(!this.createEditBoardPlannedStart() && this.createEditBoardPlannedEnd() || (this.createEditBoardPlannedStart() && this.createEditBoardPlannedEnd() && this.createEditBoardPlannedStart() > this.createEditBoardPlannedEnd()))
                    {
                        this.showDateValidationError(true);
                        return;
                    }
                    this.showDateValidationError(false);

                    // Send Request
                    var url = "/api/TaskApi/CreateTaskBoard";
                    if(this.editingBoard)
                    {
                        url = "/api/TaskApi/UpdateTaskBoard?id=" + this.editingBoard.id;
                    }

                    var request = {
                        name: this.createEditBoardName(),
                        plannedStart: this.createEditBoardPlannedStart(),
                        plannedEnd: this.createEditBoardPlannedEnd()
                    };

                    this.isLoading(true);
                    this.resetErrorState();
                    var self = this;
                    jQuery.ajax({ 
                        url: url, 
                        headers: GoNorth.Util.generateAntiForgeryHeader(),
                        data: JSON.stringify(request), 
                        type: "POST",
                        contentType: "application/json"
                    }).done(function(save) {
                        self.isLoading(false);
                        self.openBoardList.loadBoards();
                        self.cancelBoardDialog();
                    }).fail(function(xhr) {
                        self.isLoading(false);
                        self.errorOccured(true);
                    });
                },

                /**
                 * Cancels the board dialog
                 */
                cancelBoardDialog: function() {
                    this.editingBoard = null;
                    this.showBoardCreateEditDialog(false);
                },


                /**
                 * Opens the confirm delete dialog for a board
                 * 
                 * @param {object} board Board to delete
                 */
                openDeleteBoardDialog: function(board) {
                    this.showConfirmDeleteDialog(true);
                    this.deleteBoardId = board.id;
                },

                /**
                 * Deletes the board
                 */
                deleteBoard: function() {
                    var self = this;
                    this.isLoading(true);
                    this.resetErrorState();
                    jQuery.ajax({ 
                        url: "/api/TaskApi/DeleteTaskBoard?id=" + this.deleteBoardId, 
                        headers: GoNorth.Util.generateAntiForgeryHeader(),
                        type: "DELETE"
                    }).done(function(data) {
                        self.isLoading(false);
                        self.openBoardList.loadBoards();
                        self.closedBoardList.loadBoards();
                    }).fail(function(xhr) {
                        self.isLoading(false);
                        self.errorOccured(true);

                        // If object is related to anything that prevents deleting a bad request (400) will be returned
                        if(xhr.status == 400 && xhr.responseText)
                        {
                            self.additionalErrorDetails(xhr.responseText);
                        }
                    });

                    this.closeConfirmDeleteDialog();
                },

                /**
                 * Closes the confirm delete dialog
                 */
                closeConfirmDeleteDialog: function() {
                    this.showConfirmDeleteDialog(false);
                    this.deleteBoardId = null;
                },


                /**
                 * Opens the confirm toogle status dialog for a board
                 * 
                 * @param {object} board Board to toogle status
                 */
                openToogleBoardStatusDialog: function(board) {
                    this.showConfirmToogleStatusDialog(true);
                    this.isToogleStatusClosing(!board.isClosed);
                    this.toogleStatusBoardId = board.id;
                },

                /**
                 * Toogles the board status
                 */
                toogleBoardStatus: function() {
                    var self = this;
                    this.isLoading(true);
                    this.resetErrorState();
                    jQuery.ajax({ 
                        url: "/api/TaskApi/SetTaskBoardStatus?id=" + this.toogleStatusBoardId + "&closed=" + this.isToogleStatusClosing(), 
                        headers: GoNorth.Util.generateAntiForgeryHeader(),
                        type: "POST"
                    }).done(function(data) {
                        self.isLoading(false);
                        self.openBoardList.loadBoards();
                        self.closedBoardList.loadBoards();
                    }).fail(function(xhr) {
                        self.isLoading(false);
                        self.errorOccured(true);
                    });

                    this.closeConfirmToogleStatusDialog();
                },

                /**
                 * Closes the confirm toogle status dialog
                 */
                closeConfirmToogleStatusDialog: function() {
                    this.showConfirmToogleStatusDialog(false);
                    this.toogleStatusBoardId = null;
                }
            };

        }(Task.ManageBoards = Task.ManageBoards || {}));
    }(GoNorth.Task = GoNorth.Task || {}));
}(window.GoNorth = window.GoNorth || {}));