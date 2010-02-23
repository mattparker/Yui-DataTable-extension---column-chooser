/*
Copyright (c) 2010 Lamplight Database Systems Limited. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.net/yui/license.txt
*/

/**
 *
 *  YAHOO.LPLT.DataTable
 *  Extends YAHOO.widget.DataTable in two ways:
 *      - to incorporate column showing/hiding.
 *      - to include keyboard navigation when inline editing
 *
 *
 *
 ******************
 * Column chooser:
 *
 *  A context menu is added to the table header which allows showing and hiding
 *  of columns.
 *
 *  Adds a config option to the menu constructor: showColumnChooser.  Set to 
 *  true to use the column chooser menu
 * 
 *  We also over-ride the destroy method of DataTable to add a 
 *  beforeDestroyEvent event.  This is fired
 *  just before the DataTable destroy method is called.
 *
 *
 *
 *
 *
 ******************
 *
 * Keyboard navigation when editing
 *
 *  While using inline editing, allows keyboard navigation from cell to cell.
 *
 *  Uses Satyam's example http://www.satyam.com.ar/yui/2.7.0/keynav.html
 *  with some modifications.
 *  
 *  Main changes:
 *   - add a method allowMoveCellWhileEdit to cell editors to decide when 
 *     to allow movement.  
 *   - make dateCellEditor do something in it's focus() method (i.e. receive focus!)
 *   - add a new row when you get to the bottom of the table.
 *
 *  Still to do:
 *   - test all the editors in different browsers: think select's may need some
 *     restrictions in allowMoveCellWhileEdit to stop up-down keys moving (as they
 *     sometimes also change the select box selectedIndex before moving).
 *   - add some paginator support, so that getting to the bottom of the table 
 *     moves you to the next page, rather than adding a record.
 *
 *   - someone with an Apple Mac to do some testing! (or give me an Apple Mac!).
 *
 *
 */
 
 
  
(function(){

 var Lang = YAHOO.lang,
     Dom = YAHOO.util.Dom;
 



  /**
   * Add a method to all editors: should they allow movement
   * Return true to allow, false to stop.
   * Overwritten by subclass if necessary
   * @method allowMoveCellWhileEdit
   * @param event keycode
   * @return bool
   */
  YAHOO.widget.BaseCellEditor.prototype.allowMoveCellWhileEdit = function( keyCode , event ){
  
    return true;
    
  };
  
  
    
  YAHOO.widget.TextareaCellEditor.prototype.allowMoveCellWhileEdit = function( keyCode , event ){
  
    var KEY = YAHOO.util.KeyListener.KEY;

      // if up or down we don't allow move:
    switch( keyCode ){
      case KEY.UP:
      case KEY.DOWN:
      case KEY.LEFT:
      case KEY.RIGHT:
        return false;
        break;
      
      default:
        return true;
        break;
    }

    
  };
  



  YAHOO.widget.TextboxCellEditor.prototype.allowMoveCellWhileEdit = function( keyCode , event ){

    var KEY = YAHOO.util.KeyListener.KEY;

      // if up or down we don't allow move:
    switch( keyCode ){
      case KEY.LEFT:
      case KEY.RIGHT:
        return false;
        break;
      
      default:
        return true;
    }

    
  };






  /**
   * Set the focus method (doesn't do anything in default implementation
   * Sets focus onto container el (which has a tabindex so takes focus)
   */
  YAHOO.widget.DateCellEditor.prototype.focus = function(){
  
    this._elContainer.focus();
  };







 
 /**
  * Constructor: parent does the work, and we add a listener to set up
  *  the columnchooser
  */
 var lpltTable = function( el , oColDef, oDS, oCfg ){
 

   lpltTable.superclass.constructor.call( this, el , oColDef, oDS, oCfg );
   
   // Events when we need to build/rebuild the menu
   this.on( "initEvent" , this.initColumnChooser, this, true );
   this.on( "columnInsertEvent" , this.refreshColumnChooserMenu, this, true );
   this.on( "columnRemoveEvent" , this.refreshColumnChooserMenu, this, true );
   this.on( "columnReorderEvent" , this.refreshColumnChooserMenu, this, true );
 
 };
 
 
 
 
YAHOO.extend( lpltTable, YAHOO.widget.DataTable, {

     /**
      * @description Reference to the column chooser context menu
      * @type Object
      */
     _columnChooserMenu:null, 


     initAttributes: function( oCfg ){
 
      lpltTable.superclass.initAttributes.call( this, oCfg );


      
       /**
        * @attribute showColumnChooser
        * @description Should the column chooser menu should be used
        * @type Bool
        * @default false
        */ 
       this.setAttributeConfig( 'showColumnChooser' , {
         validator: function(v){ return Lang.isBoolean( v ); },
         value: false
        } 
			 );
			 
			 
			 
       /**
        * @attribute multiCellEditNav
        * @description Turns on navigation around the table with inline editing
        * @type Bool
        * @default false
        */ 
       this.setAttributeConfig( 'multiCellEditNav' , {
         validator: function(v){ return Lang.isBoolean( v ); },
         value: false,
         method: function( v ){
           if ( v === true ){
             this.on( "editorKeydownEvent", this.moveCellsWhileEditing , this , true );
             this.on( "editorShowEvent", this.keepEditorVisible, this, true );
           }
         }
        } 
			 );			 

		},



       /**
        * Adds a context menu that takes columns and allows them to be shown
        * or hidden
        *
        */
       initColumnChooser: function(){
       
         // check if column chooser should be used:
         if( !this.get( "showColumnChooser" ) ){ return; }


         // create a context menu and add items to it, one for each column
         var cMenu = new YAHOO.widget.ContextMenu( Dom.generateId( ), 
                                            { trigger: this.getTheadEl() } );


         this._addColumnChooserMenuItems( cMenu );
         
        
         // render the menu
         cMenu.render( this.get("element") );
         
         // menu click handler
         cMenu.subscribe( "click", this.doColumnChooser, this, true );
         // And a column show/hide handler that updates the menu check states.
         // Doing it this way means that if columns are shown/hidden in other 
         //   ways the menu will be up to date
         this.subscribe( "columnHideEvent" , this.updateColumnChooser, this, true );
         this.subscribe( "columnShowEvent" , this.updateColumnChooser, this, true );
         
         // finally, make sure the context menu is destroyed when the table is:
         this.subscribe( "beforeDestroyEvent" , this.destroyColumnChooser , this, true);

         
         // Keep a reference to it:
         this._columnChooserMenu = cMenu;

         
       },
       


       
       /**
        * Clears the column chooser context menu and re-reads columns
        */
       refreshColumnChooserMenu: function(){
             var cMenu = this._columnChooserMenu;
             
             if( cMenu === undefined || cMenu === null ){
               return false;
             }
             
             cMenu.clearContent();
             
             this._addColumnChooserMenuItems( cMenu );
             
             this._columnChooserMenu = cMenu;
       },
       



       
       /**
        * Updates the 'checked' state of the menu based on visibility of cols.
        */
       updateColumnChooser: function( ){

         // loop through the columns:
         var allColumns = this.getColumnSet().keys,
             cMenu = this._columnChooserMenu;
       
         for( var i = 0, l = allColumns.length; i < l; i++ ){
             cMenu.getItem( i ).cfg.setProperty( "checked", !allColumns[i].hidden );
         }
       },



       /**
        * Adds columns to the column chooser context menu
        * @param {YAHOO.widget.ContextMenu}  Context menu to add items to
        */
       _addColumnChooserMenuItems: function( cMenu ){
         // loop through the columns:
         var allColumns = this.getColumnSet().keys;
       
         for( var i = 0, l = allColumns.length; i < l; i++ ){
             cMenu.addItem( { text: allColumns[ i ].label || allColumns[ i ].getKey(), 
                              value: allColumns[ i ].getKey() , 
                              checked: !allColumns[i].hidden } );
         }

       },       



       
       /**
        * Handler for column chooser context menu
        * @param String  will be "click"
        * @param Array   Arguments passed: first is Event Object, second is the
        *                MenuItem that was clicked
        * @param Object  The menu
        */
       doColumnChooser: function( strEv, obEv, menu ){

         // This is the menuitem
         var tar = obEv[1],
         // This is the column:
             col = this.getColumn( tar.value );

         // If column is hidden, show it:
         if( col.hidden ){
           this.showColumn( col );
         }
         else{
           //tar.cfg.setProperty( "checked" , true );
           this.hideColumn( col );
         }
         
       },
       

      /**
       * Destroys the column chooser context menu.
       */
      destroyColumnChooser: function(){
         if( this._columnChooserMenu !== undefined ){
            this._columnChooserMenu.destroy();
         }
      },

       
      /**
       * Over-ride destroy to fire an event first and then do the destruction
       */ 
      destroy: function(){
         this.fireEvent( "beforeDestroyEvent" );
         lpltTable.superclass.destroy.call( this );
       },
       
       
       
       
       
       
       
       
       
       
       
       
       
       ///////////////////////////////////////////////////////
       /////
       ///// For multi-cell editing, with tab/arrows moving
       ///// between cells
       ///// Thanks to Satyam http://satyam.com.ar/yui/2.7.0/keynav.html
       ///////////////////////////////////////////////////////
      /* Start of change by Satyam to allow for keyboard navigation */

       moveCellsWhileEditing: function( oArgs ){

       			var self = this,
        				ed = this._oCellEditor,  // Should be: oArgs.editor, see: http://yuilibrary.com/projects/yui2/ticket/2513909
        				ev = oArgs.event,
        				cell = ed.getTdEl(),
        				col = ed.getColumn(),
        				row,rec,
        				KEY = YAHOO.util.KeyListener.KEY,
        				
        				editNext = function(cell) {
        					cell = self.getNextTdEl(cell);
        					while (cell && !self.getColumn(cell).editor) {
        						cell = self.getNextTdEl(cell);
        					}
                // add a blank row:
        				if ( !cell ) {
        					  self.addRow({});
        					  cell = self.getFirstTdEl( self.getLastTrEl() );
        					  while ( cell && !self.getColumn(cell).editor) {
        						  cell = self.getNextTdEl(cell);
        				  	}
        				  }
        				  
        					if (cell) {
        						self.showCellEditor(cell);
        					}
        				},
        				editPrevious = function(cell) {
        					cell = self.getPreviousTdEl(cell);
        					while (cell && !self.getColumn(cell).editor) {
        						cell = self.getPreviousTdEl(cell);
        					}
        					if (cell) {
        						self.showCellEditor(cell);
        					}
        				};
    			
        			// Check if the editor allows movement with this key press:
        			if ( !ed.allowMoveCellWhileEdit( ev.keyCode , ev ) ) {
                return;
        			}
        				
        			switch (ev.keyCode) {
        				case KEY.UP:

        					YAHOO.util.Event.stopEvent(ev);
        					ed.save();
        					row = this.getPreviousTrEl(cell);
        					if (row) {
        						rec = this.getRecord(row);
        						this.showCellEditor({record:rec,column:col});
        					}
        					break;
        					
        				case KEY.DOWN:

        					YAHOO.util.Event.stopEvent(ev);
        					ed.save();
        					row = this.getNextTrEl(cell);
        				  // Add a row at the end if we're at the last row
                	if ( !row ) { 
        					  this.addRow( {} );
        					  row = this.getLastTrEl(cell);
        				  }
        				  
        				  if ( row ) {
        						rec = this.getRecord(row);
        						this.showCellEditor({record:rec,column:col});
        					}
        					break;
        					
        				case KEY.LEFT:
        					YAHOO.util.Event.stopEvent(ev);
        					ed.save();
        					editPrevious(cell);
        					break;
        					
        				case KEY.RIGHT:
        					YAHOO.util.Event.stopEvent(ev);
        					ed.save();
        					editNext(cell);
        					break;
        					
        				case KEY.TAB:

        					YAHOO.util.Event.stopEvent(ev);
        					ed.save();
        					if (ev.shiftKey) {
        						editPrevious(cell);
        					} else {
        						editNext(cell);
        					}
        					break;
        			}
        		},
        		
        		// End of key handling
        		
        		// The following code tries to keep the cell editor visible at all times.
            keepEditorVisible : function (oArgs) {

              oArgs.editor.multiCellEditNav( true );
              
        			var Dom = YAHOO.util.Dom;
        			var el = oArgs.editor.getContainerEl();
        			var reg = Dom.getRegion(el);
        			var topScreen = Dom.getDocumentScrollTop(),
        				bottomScreen = topScreen + Dom.getViewportHeight();
        			if (reg.top < topScreen) {
        				el.scrollIntoView();
        			}
        			if (reg.bottom > bottomScreen) {
        				el.scrollIntoView(false);
        			}
        			

        			
        			
        		}
        		
        		// End of patch.

       
       
       


     } 
);
     

YAHOO.namespace( "LPLT" );
YAHOO.LPLT.DataTable = lpltTable;






 
})();