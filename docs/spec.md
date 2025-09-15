# JadeGrid Specification

This document provides a detailed specification for JadeGrid, a lightweight, high-performance JavaScript data grid.

## 1. Introduction

JadeGrid is a pure JavaScript data grid component with no external dependencies. It is designed for displaying and manipulating tabular data with high performance, leveraging virtual scrolling to handle large datasets efficiently.

## 2. Features

- **Virtual Scrolling:** Renders only the visible rows, allowing for smooth scrolling through thousands or even millions of records.
- **Multi-Column Sorting:** Allows users to sort data by multiple columns.
- **Filtering and Searching:** Provides a search panel to filter data.
- **In-Cell Editing:** Supports editing data directly within the grid cells.
- **Selection:** Supports both single and multiple row selection with checkboxes.
- **Pagination:** Supports both client-side and server-side pagination.
- **Themes:** Comes with light and dark themes, and is easily customizable.
- **Export to CSV:** Allows exporting the grid data to a CSV file.
- **i18n Support:** Supports internationalization.

## 3. Options

The grid is initialized with an options object. The following are the available options:

| Option | Type | Default | Description |
|---|---|---|---|
| `columns` | `Array` | `[]` | An array of column definition objects. See [Column Options](#4-column-options) for details. |
| `data` | `Array` | `[]` | An array of data objects to be displayed in the grid (for client-side data). |
| `dataSource` | `Object` | `null` | An object for configuring server-side data operations. |
| `height` | `Number` | `480` | The height of the grid in pixels. |
| `selection` | `Object` | `{ mode: 'multiple', checkbox: true, preserveOnPageChange: true }` | Configuration for row selection. |
| `sorting` | `Object` | `{ multi: true, server: false }` | Configuration for sorting. |
| `filtering` | `Object` | `{ server: false, searchPanel: { visible: true, placeholder: null } }` | Configuration for filtering. |
| `pagination` | `Object` | `{ server: false, pageSize: 50, pageSizes: [20, 50, 100, 200] }` | Configuration for pagination. |
| `virtualization` | `Object` | `{ rows: true, overscan: 6, rowHeight: 36 }` | Configuration for virtualization. |
| `editing` | `Object` | `{ mode: 'cell', validation: { showMessages: true, stopOnFirstError: true } }` | Configuration for editing. |
| `export` | `Object` | `{ excel: { enabled: true, filename: 'export.csv', onlySelected: false } }` | Configuration for exporting data. |
| `masterDetail` | `Object` | `{ enabled: false, lazy: true, template: null }` | Configuration for master-detail views. |
| `locale` | `String` | `'zh-TW'` | The locale for internationalization. |
| `theme` | `String` | `'light'` | The theme of the grid ('light' or 'dark'). |
| `onReady` | `Function` | `null` | A callback function that is executed when the grid is ready. |
| `onDataLoaded` | `Function` | `null` | A callback function that is executed when data is loaded. |
| `onError` | `Function` | `null` | A callback function that is executed when an error occurs. |
| `rowKey` | `String` | `null` | The field to use as a unique key for each row. If null, an internal ID is used. |

## 4. Column Options

Each column in the `columns` array is an object with the following properties:

| Option | Type | Default | Description |
|---|---|---|---|
| `field` | `String` | `''` | The field from the data object to be displayed in this column. |
| `title` | `String` | `''` | The title of the column to be displayed in the header. |
| `width` | `Number` | `undefined` | The width of the column in pixels. |
| `type` | `String` | `'string'` | The data type of the column ('string', 'number', 'date', 'boolean'). |
| `align` | `String` | `'left'` | The horizontal alignment of the cell content ('left', 'center', 'right'). |
| `sortable` | `Boolean` | `false` | Whether the column can be sorted. |
| `filter` | `Boolean` | `false` | Whether the column can be filtered. |
| `editable` | `Boolean` | `false` | Whether the cells in this column can be edited. |
| `validator` | `Function` | `null` | A function to validate the cell value during editing. |
| `summary` | `String` | `null` | The type of summary to display in the footer ('sum', 'avg', 'min', 'max', 'count'). |

## 5. Public Methods

The following methods are available on a JadeGrid instance.

| Method | Parameters | Description |
|---|---|---|
| `setData(data)` | `data: Array` | Loads an array of data into the grid. |
| `reload()` | - | Reloads the data from the configured `dataSource`. |
| `getData()` | - | Returns the original data array loaded into the grid. |
| `getState()` | - | Returns the current state of the grid (page, pageSize, sortModel). |
| `setState(state)` | `state: Object` | Sets the state of the grid and re-renders. |
| `getSelectedRows()` | - | Returns an array of the selected row data objects. |
| `selectAll()` | - | Selects all rows in the grid. |
| `clearSelection()` | - | Clears all row selections. |
| `goToPage(page)` | `page: Number` | Navigates to the specified page number. |
| `scrollToRow(index)` | `index: Number` | Scrolls the grid to the row at the specified index. |
| `startEdit(options)` | `options: { rowIndex, colKey }` | Programmatically starts editing a cell. |
| `commitEdits()` | - | Commits the currently active edit. |
| `cancelEdits()` | - | Cancels the currently active edit. |
| `exportToExcel(options)` | `options: { filename, onlySelected }` | Exports the grid data to a CSV file. |
| `sizeColumnsToFit()` | - | Resizes all columns to fit the available grid width. |
| `destroy()` | - | Destroys the grid instance and cleans up all associated elements and event listeners. |

## 6. Events

The grid triggers several events that you can listen for by providing callback functions in the options.

| Event | Payload | Description |
|---|---|---|
| `onReady` | `grid` | Fired when the grid has been initialized and is ready. |
| `onDataLoaded` | `{ data, total }` | Fired when new data has been loaded and rendered. |
| `onError` | `error` | Fired when an error occurs, e.g., during data loading. |
| `onSelectionChanged` | `{ rows }` | Fired when the row selection changes. |
| `onCellEditStart` | `{ row, col, oldValue }` | Fired when a cell enters edit mode. |
| `onCellEditCommit` | `{ row, col, oldValue, newValue }` | Fired when a cell edit is successfully committed. |
| `onCellEditCancel` | `{ row, col }` | Fired when a cell edit is canceled. |