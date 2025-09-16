# JadeGrid System Design and Architecture

This document outlines the system design and architecture of JadeGrid, a lightweight, high-performance JavaScript data grid.

## 1. High-Level Architecture

JadeGrid is a standalone JavaScript component with no external dependencies. Its architecture is designed to be modular and extensible, with a clear separation of concerns. The core of the grid is the `JadeGrid` class, which manages the grid's state, rendering, and user interactions.

The overall architecture can be visualized as follows:

```
          +--------------------+
          |  User Interaction  |
          +--------------------+
                   |
                   v
          +--------------------+
          |   JadeGrid Class   |
          +--------------------+
      ____________| |______________
     |              |              |
     v              v              v
+----------+  +----------------+  +--------------+
|  Data    |  |   Rendering    |  |    Event     |
|  Source  |  |     Engine     |  |    System    |
+----------+  +----------------+  +--------------+
  |      |      |   |    |   |          |
  v      v      v   v    v   v          v
[Local] [Remote] [T] [H]  [B] [F]    [App Logic]
```

## 2. Core Components

### 2.1. JadeGrid Class

The `JadeGrid` class is the central component of the system. It is responsible for:

-   **Initialization:** Setting up the grid with the provided options.
-   **State Management:** Maintaining the grid's state, including data, sorting, filtering, and pagination settings.
-   **Data Handling:** Managing both client-side and server-side data.
-   **Rendering:** Orchestrating the rendering of the grid's components.
-   **Event Handling:** Managing user interactions and emitting events.
-   **Public API:** Exposing methods for programmatic control of the grid.

### 2.2. Rendering Engine

The rendering engine is responsible for creating and updating the DOM elements of the grid. It is composed of the following sub-components:

-   **Toolbar:** Renders the toolbar, which includes the search panel, theme switcher, and export button.
-   **Header:** Renders the column headers, including sorting indicators and selection checkboxes.
-   **Body:** Renders the data rows. It uses virtual scrolling to efficiently handle large datasets by only rendering the visible rows.
-   **Footer:** Renders the footer, which includes the pagination controls.

### 2.3. Data Pipeline

The data pipeline is a series of transformations applied to the data before it is rendered. The pipeline consists of the following steps:

1.  **Filtering:** Filters the data based on the search query.
2.  **Sorting:** Sorts the data based on the configured sort columns.
3.  **Pagination:** Paginates the data based on the current page and page size.

This pipeline can be executed on the client-side for local data or on the server-side for remote data.

### 2.4. Event System

The event system allows the application to respond to user interactions and changes in the grid's state. The grid emits a variety of events, such as `onSelectionChanged`, `onCellEditCommit`, and `onDataLoaded`. Applications can listen for these events and implement custom logic.

## 3. Data Flow

### 3.1. Client-Side Data

1.  The user provides an array of data to the `data` option.
2.  The grid applies the data pipeline (filtering, sorting, pagination) to the data on the client-side.
3.  The rendering engine displays the transformed data.

### 3.2. Server-Side Data

1.  The user configures a `dataSource` object with a `load` function.
2.  When the grid needs data (e.g., on initial load, page change, or sort), it calls the `load` function with the current state (page, pageSize, sortModel, filterModel).
3.  The `load` function sends a request to the server with the state parameters.
4.  The server processes the request (queries the database, etc.) and returns the data for the current page.
5.  The grid renders the received data.

## 4. Modularity and Extensibility

JadeGrid is designed to be modular and extensible. The clear separation of concerns between the core components allows for individual components to be customized or replaced. For example, a developer could create a custom rendering engine to change the look and feel of the grid, or a custom data source to load data from a different type of backend.