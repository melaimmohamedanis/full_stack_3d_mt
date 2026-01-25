# 🌍 MT-MPDEM Plot: 3D Geophysical Data Visualization Platform

A full-stack web application for interactive 3D visualization of magnetotelluric (MT) and multi-physics geophysical data, including resistivity models, station locations, and earthquake clusters. Built with **React + TypeScript + Three.js** on the frontend and **Node.js + Express** on the backend.

![App Screenshot Placeholder](https://github.com/melaimmohamedanis/full_stack_3d_mt/blob/master/front_end/public/Screenshot%202026-01-18%20122848.png) 
![App Screenshot Placeholder](https://github.com/melaimmohamedanis/full_stack_3d_mt/blob/master/front_end/public/Screenshot%202026-01-18%20135249.png)  
![App Screenshot Placeholder](https://github.com/melaimmohamedanis/full_stack_3d_mt/blob/master/front_end/public/Screenshot%202026-01-25%20214505.png)  


*Example: Horizontal slice at depth Z with resistivity anomaly and station markers*

---

## ✨ Features

- **Interactive 3D Visualization** using [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) and [Three.js](https://threejs.org/)
- **Multi-planar slicing**:
  - Vertical North-South cross-section
  - Vertical East-West cross-section
  - Horizontal (X-Y) slice at adjustable depth (Z)
- **Resistivity anomaly mapping** with color-coded ranges
- **Geospatial support**:
  - UTM coordinate conversion (`utm`, `proj4`)
  - Station overlay plotting
  - Earthquake cluster visualization
- **Ray marching rendering** for smooth volumetric data display
- **File upload & parsing** for custom geophysical datasets


---

## 🗂️ Project Structure

```bash
mt_mpdem_plot/
├── backend/                 # Node.js API server
│   ├── parser/              # Data parsers
│   │   ├── dataParser.js    # Main resistivity grid parser
│   │   ├── modelParser.js   # 3D model structure parser
│   │   └── earthquakeParser.js # Seismic event parser
│   ├── processing/          # Data processing modules
│   │   ├── processModel.js  # Core model processor
│   │   ├── shrinkModel.js   # Grid resolution reducer
│   │   └── interpolationModel.js # Spatial interpolator
│   └── server.js            # Express server entry point
│
├── frontend/                # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Anomaly5.tsx       # Resistivity range visualizer
│   │   │   ├── VerticalEastSlice.tsx  # E-W slice views
├   │   │   │── VerticalNorthSlice.tsx  # N-S slice views
│   │   │   └── HorizontalSlice.tsx # X-Y depth slice
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── ...
│
└── README.md


## 🚀 Installation & Usage

### Prerequisites
- **Node.js**: Version `22.10` is required.
- **Data Files**: `.rho` (Model), `.dat` (Stations), `.edi` (Topography).

### 1. Backend Setup
The backend handles data parsing, UTM transformations, and calibration.

```bash
# Clone the repository
git clone [https://github.com/melaimmohamedanis/full_stack_3d_mt.git](https://github.com/melaimmohamedanis/full_stack_3d_mt.git)
cd full_stack_3d_mt/backend

# Install dependencies
npm install

# Data Preparation
# Place your .rho, .dat, and .edi files in the /backend/data folder.
# Configure your 'z_datum' (the starting depth of your model) in the config.

# Start the processing server
npm start

The server will run at http://localhost:5000.



2. Frontend Setup
The frontend provides the interactive 3D environment using React and Three.js.
# Navigate to the frontend directory
cd ../front_end

# Install all frontend dependencies (Three.js, React-Three-Fiber, etc.)
npm install

# Configure Environment (Optional)
# If your backend is running on a custom port, update the API URL in src/config.ts

# Start the development server
npm run dev

Open your browser to http://localhost:5173 to view the platform.
