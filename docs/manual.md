# How to Deploy JadeGrid

Here is a step-by-step guide to integrate JadeGrid into your own project.

## Step 1: Copy Files

Copy the following files into your project directory:

- `jadeGrid.js`
- `jadeGrid.css`

## Step 2: Include Files in Your HTML

In your HTML file, add the following lines in the `<head>` section to include the CSS, and before the closing `</body>` tag to include the JavaScript.

```html
<head>
    <!-- ... other head elements ... -->
    <link rel="stylesheet" href="path/to/your/jadeGrid.css">
</head>
<body>
    <!-- ... your page content ... -->
    <script src="path/to/your/jadeGrid.js"></script>
</body>
```

## Step 3: Create a Container

Add a `<div>` element in your HTML where you want the grid to appear. Give it a unique ID.

```html
<div id="myGrid"></div>
```

## Step 4: Initialize the Grid

Add a `<script>` block to your HTML to initialize JadeGrid. You will need to provide data and column definitions.

```html
<script>
    // Your data
    var myData = [
        { id: 1, name: 'First Item', value: 'A' },
        { id: 2, name: 'Second Item', value: 'B' }
    ];

    // Column definitions
    var myColumns = [
        { field: 'id', text: 'ID', width: 80 },
        { field: 'name', text: 'Name', width: 200 },
        { field: 'value', text: 'Value', width: 100 }
    ];

    // Find the container element
    var gridContainer = document.getElementById('myGrid');

    // Create a new JadeGrid instance
    var grid = new JadeGrid(gridContainer, {
        data: myData,
        columns: myColumns,
        height: 300 // Optional: set the height of the grid
    });
</script>
```

That's it! You should now have a working JadeGrid in your project.