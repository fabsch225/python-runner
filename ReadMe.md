# Python & R Runner Obsidian Plugin

A simple Obsidian plugin to run Python and R code blocks directly within your notes, with support for displaying plots.

## Features

- Execute Python and R code blocks in Markdown files.
- Display output and plots (from matplotlib or R) inline or in a dedicated panel.
- Configure a path to R / Python in the Settings

## Usage

1. Install the plugin in your Obsidian vault.
2. Write Python or R code in a Markdown code block
````md
    ```xpython
        import matplotlib.pyplot as plt
        plt.plot([1, 2, 3], [4, 5, 6])
        plt.show()
    ```
````
````md
    ```xr
        plot(1:10, 1:10)
    ```
````
3. Run the code using the plugin's command or button.

## Requirements

- Python and/or R installed on your system.
- Obsidian v0.12.0 or higher.

## License

MIT