# LaTeX-Vision
 Simple API to display LaTeX math functions, as stunning visual graphs.


## Example
For example: `Y = x^2` displays:

![Loading...](https://latex-vision.up.railway.app/api/v1)

## API Usage

The main endpoint is `/api/v1/` which accepts the following parameters:

- `graph`: Single LaTeX function to graph (e.g. `y=x^2`)
- `graphs`: Array of multiple functions (e.g. `["y=x^2", "y=sin(x)"]`) 
- `bounds`: Graph viewport limits (default: `{"left":-20,"right":20,"top":20,"bottom":-20}`)
- `width/height`: Image dimensions in pixels (default: 400x400)

### Examples:

**Basic parabola:**

[```/api/v1/?graph=y=x^2```](https://latex-vision.up.railway.app/api/v1/?graph=y=x^2)

**Multiple functions:**

[```/api/v1/?graphs=["y=sin(x)","y=cos(x)"]```](https://latex-vision.up.railway.app/api/v1/?graphs=["y=sin(x)","y=cos(x)"])

**Custom viewport:**

[```/api/v1/?graph=y=x^2&bounds={"left":-5,"right":5,"top":10,"bottom":-10}```](https://latex-vision.up.railway.app/api/v1/?graph=y=x^2&bounds={"left":-5,"right":5,"top":10,"bottom":-10})
