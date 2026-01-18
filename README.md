# 🌍 MT-MPDEM Plot: 3D Geophysical Data Visualization Platform

A full-stack web application for interactive 3D visualization of magnetotelluric (MT) and multi-physics geophysical data, including resistivity models, station locations, and earthquake clusters. Built with **React + TypeScript + Three.js** on the frontend and **Node.js + Express** on the backend.

![App Screenshot Placeholder](https://github.com/melaimmohamedanis/full_stack_3d_mt/blob/master/front_end/public/Screenshot%202026-01-18%20122848.png) 
![App Screenshot Placeholder](https://github.com/melaimmohamedanis/full_stack_3d_mt/blob/master/front_end/public/Screenshot%202026-01-18%20135249.png)  

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
- Real-time parameter adjustment via [Leva](https://leva.pmnd.rs/) controls

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