const adminMenuItems: MenuItem[] = [
    { path: "/", name: "Home", icon: <FiHome className="mr-2" /> },

    {
      path: "/users",
      name: "Manage Users",
      icon: <FiUsers className="mr-2" />,
      children: [
        {
          path: "/users/",
          name: "user",
          icon: <FiEdit className="mr-2" />,
        },

        {
          path: "/users/view_user",
          name: "View User",
          icon: <FiEye className="mr-2" />,
        },
         {
          path: "/users/create_user",
          name: "Create/Edit User",
          icon: <FiEye className="mr-2" />,
        },
         {
          path: "/users/create_user",
          name: "password Reset",
          icon: <FiEye className="mr-2" />,
        },
      ],
    },

    {
      path: "/upload_data",
      name: "Price Data",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "upload_data/uploaded_data",
          name: "uploaded_data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "upload_data/finalized_data",
          name: "Finalized Data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
      ],
    },

    {
      path: "/compilation",
      name: "Compilation",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "compilation/compile_results",
          name: "Generate Index",
          icon: <FaFileUpload className="mr-2" />, // Represents uploading
        },
        {
          path: "compilation/compilation_index",
          name: "Compile index",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "compilation/compilation_index",
          name: "Approve Compile Index",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },

        {
          path: "compilation/compilation_index",
          name: "Finalized index",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
       
      ],
    },


    {
      path: "/reference_data",
      name: "Weight/Coicop",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "compilation/compile_results",
          name: "View Weights",
          icon: <FaFileUpload className="mr-2" />, // Represents uploading
        },
        {
          path: "compilation/compilation_index",
          name: "Coicop Mapping",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "compilation/compilation_index",
          name: "Market Details",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },

      
      ],
    },

 
  ];

  const compilerMenuItems: MenuItem[] = [
    // { path: "/", name: "Home", icon: <FiHome className="mr-2" /> },

    { path: "/", name: "Home", icon: <FiHome className="mr-2" /> },

    {
      path: "/upload_data",
      name: "Price Data",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "upload_data/uploaded_data",
          name: "uploaded_data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "upload_data/finalized_data",
          name: "Finalized Data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
      ],
    },

    {
      path: "/compilation",
      name: "Compilation",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "compilation/compile_results",
          name: "Generate Index",
          icon: <FaFileUpload className="mr-2" />, // Represents uploading
        },
        {
          path: "compilation/compilation_index",
          name: "Compiled indexes",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },

        {
          path: "compilation/compilation_index",
          name: "Finalized index",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        // {
        //   path: "/compile/annexture",
        //   name: "Annexture",
        //   icon: <FaCogs className="mr-2" />,
        // },
      ],
    },
    
    {
      path: "/reference_data",
      name: "Weight/Coicop",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "compilation/compile_results",
          name: "View Weights",
          icon: <FaFileUpload className="mr-2" />, // Represents uploading
        },
        {
          path: "compilation/compilation_index",
          name: "Coicop Mapping",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "compilation/compilation_index",
          name: "Market Details",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },

      
      ],
    },
  ];

  const reviewerMenuItems: MenuItem[] = [
    { path: "/", name: "Home", icon: <FiHome className="mr-2" /> },

    {
      path: "/users",
      name: "Manage Users",
      icon: <FiUsers className="mr-2" />,
      children: [
        // {
        //   path: "/users/",
        //   name: "user",
        //   icon: <FiEdit className="mr-2" />,
        // },

        {
          path: "/users/view_user",
          name: "View User",
          icon: <FiEye className="mr-2" />,
        },
        
      ],
    },

    {
      path: "/upload_data",
      name: "Price Data",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "upload_data/uploaded_data",
          name: "uploaded_data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "upload_data/finalized_data",
          name: "Finalized Data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
      ],
    },

    {
      path: "/compilation",
      name: "Compilation",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        
        {
          path: "compilation/compilation_index",
          name: "Compiled indexes",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
       

        {
          path: "compilation/compilation_index",
          name: "Finalized index",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
       
      ],
    },


    {
      path: "/reference_data",
      name: "Weight/Coicop",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "compilation/compile_results",
          name: "View Weights",
          icon: <FaFileUpload className="mr-2" />, // Represents uploading
        },
        {
          path: "compilation/compilation_index",
          name: "Coicop Mapping",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "compilation/compilation_index",
          name: "Market Details",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },

      
      ],
    },

 
  ];

  const approverMenuItems: MenuItem[] = [
    { path: "/", name: "Home", icon: <FiHome className="mr-2" /> },

    

    {
      path: "/upload_data",
      name: "Price Data",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "upload_data/uploaded_data",
          name: "uploaded_data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "upload_data/finalized_data",
          name: "Finalized Data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
      ],
    },

    {
      path: "/compilation",
      name: "Compilation",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "compilation/compile_results",
          name: "Compled index",
          icon: <FaFileUpload className="mr-2" />, // Represents uploading
        },
       
        {
          path: "compilation/compilation_index",
          name: "Approve Compile Index",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },


        {
          path: "compilation/compilation_index",
          name: "Finalized index",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
      ],
    },
    
    {
      path: "/reference_data",
      name: "Weight/Coicop",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "compilation/compile_results",
          name: "View Weights",
          icon: <FaFileUpload className="mr-2" />, // Represents uploading
        },
        {
          path: "compilation/compilation_index",
          name: "Coicop Mapping",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "compilation/compilation_index",
          name: "Market Details",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },

      
      ],
    },
  ];

  const userMenuItems: MenuItem[] = [
    { path: "/", name: "Home", icon: <FiHome className="mr-2" /> },

    {
      path: "/upload_data",
      name: "Price Data",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "upload_data/finalized_data",
          name: "Finalized Data",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
      ],
    },

    {
      path: "/compilation",
      name: "Compilation",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
     

        {
          path: "compilation/compilation_index",
          name: "Finalized index",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
      ],
    },
    
    {
      path: "/reference_data",
      name: "Weight/Coicop",
      icon: <BsCalendar3Event className="mr-2" />, // Section or category icon
      children: [
        {
          path: "compilation/compile_results",
          name: "View Weights",
          icon: <FaFileUpload className="mr-2" />, // Represents uploading
        },
        {
          path: "compilation/compilation_index",
          name: "Coicop Mapping",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },
        {
          path: "compilation/compilation_index",
          name: "Market Details",
          icon: <FaEye className="mr-2" />, // Represents viewing
        },

      
      ],
    },
  ];    add meaningfull Icons icons should be unique respective sidebar items