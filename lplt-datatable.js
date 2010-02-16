/*
Copyright (c) 2010 Lamplight Database Systems Limited. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.net/yui/license.txt
*/

/**
 *
 *  YAHOO.LPLT.DataTable
 *  Extends YAHOO.widget.DataTable to incorporate column showing/hiding.
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
 */ 
(function(){

 var Lang = YAHOO.lang,
     Dom = YAHOO.util.Dom;
 
 
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
         cMenu.render( document.body );
         
         // menu click handler
         cMenu.subscribe( "click", this.doColumnChooser, this, true );
         
         // finally, make sure the context menu is destroyed when the table is:
         this.subscribe( "beforeDestroyEvent" , this.destroyColumnChooser , this, true);

         
         // Keep a reference to it:
         this._columnChooserMenu = cMenu;

         
       },
       


       
       /**
        * Clears the column chooser context menu and re-reads columns
        */
       refreshColumnChooserMenu: function(){
             cMenu = this._columnChooserMenu;
             
             if( cMenu === undefined || cMenu === null ){
               return false;
             }
             
             cMenu.clearContent();
             
             this._addColumnChooserMenuItems( cMenu );
             
             this._columnChooserMenu = cMenu;
       },



       /**
        * Adds columns to the column chooser context menu
        * @param {YAHOO.widget.ContextMenu}  Context menu to add items to
        */
       _addColumnChooserMenuItems: function( cMenu ){
         // loop through the columns:
         var allColumns = this.getColumnSet().keys;
       
         for( var i = 0, l = allColumns.length; i < l; i++ ){
             cMenu.addItem( { text: allColumns[ i ].label , 
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

         // If column is visible it's checked:
         if( tar.cfg.getProperty( "checked" ) && !col.hidden ){
           tar.cfg.setProperty( "checked", false );
           this.hideColumn( col );
         }
         else{
           tar.cfg.setProperty( "checked" , true );
           this.showColumn( col );         
         }
         
       },
       

      /**
       * Destroys the column chooser context menu.
       */
      destroyColumnChooser: function(){
         this._columnChooserMenu.destroy();
      },

       
      /**
       * Over-ride destroy to fire an event first and then do the destruction
       */ 
      destroy: function(){
         this.fireEvent( "beforeDestroyEvent" );
         lpltTable.superclass.destroy.call( this );
       }


     } 
);
     
     
YAHOO.LPLT.DataTable = lpltTable;






 
})();