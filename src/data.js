export default {
    sections: [
        {title: "keynotes", text: "8.30-9.30, 4 x 15 mins, one track session", link: "common_teams_link"},
        {title: "presentations", text: "9.30-11.00, 10 x 6 min, one track session", link: "common_teams_link"},
        {title: "posters", text: "11.00-13.00, 50+ posters, parallel track session", link: "common_teams_link"}
    ],
    tags: [
        "ai", 
        "data", 
        "cloud", 
        "edge", 
        "datascience", 
        "4G/5G/6G",
        "iot",
        "cybersecurity",
        "software"
    ],
    keynotes: [
        {title: "Welcome and Introduction", byline: "RISE Computer Science", presenter: "Sverker Jansson and Hanifeh Khayyeri", text: "RISE Dept. of Computer Science welcomes you to this Open House event.", link: "common_teams_link"},
        {title: "Ali Ghodsi, CEO Databricks", byline: "Fireside chat", presenter: "Ali Ghodsi, Seif Haridi, Martin Körling", text: "The journey from SICS/RISE to Berkeley and Silicon Valley, Databricks from Spark to full data platfrom, Cloud versus On-prem. Longer version will be available.", link: "common_teams_link"},
        {title: "Jim Dowling, CEO Hopsworks", byline: "Fireside chat", presenter: "Jim Dowling, Seif Haridi, Martin Körling", text: "Hopsworks, the importance of Feature Stores, start-ups in Europe versus the US.", link: "common_teams_link"},
        {title: "Staffan Truvé, CTO Recorded Future", byline: "Presentation", presenter: "Staffan Truvé", text: "Recorded Future", link:  "common_teams_link"}
    ],
    presentations: [
        {title: "AI-NLP", byline: "Language Models for NLP – Is Bigger Always Better?", presenter: "Joakim Nivre", text: "Recent advances in NLP thanks to large-scale pre-trained language models like BERT and GPT-3 may suggest that the way forward is to build ever larger models on ever more data. Even if this is true, there will always be situations where it is hard or impractical to use the largest models. More generally, we should always strive to minimize the resources needed to achieve sufficient performance.", link: "common_teams_link"},
        {title: "AI-DL", byline: "Deep learning for real problems in the face of limited training data", presenter: "Olof Mogren", text: "AI has become one of the most influential technologies, often powered by deep learning; a technology achieving astonishing results in a diverse set of tasks. However, limitations in training data may have severely detrimental effects. In this talk, we’ll see some examples of how RISE develops solutions to many challenging problems in the face of limitations in the training data.", link: "common_teams_link"},
        {title: "Cyber Security", byline: "Are you ready for the next attack?", presenter: "Shahid Raza", text: "Cybercriminals, we don’t like them, but we must give them one thing: a true innovator spirit. This results in wide range and different sophistication levels of cyber-attacks. Cybersecurity is a continuous process and is more like a cat and mouse game, where the power-shift changes over time. This talk will highlight short- as well as more strategic long-term research initiatives, which can increase Swedish competitiveness to defend against cyber-attackers having heterogenous capabilities.", link: "common_teams_link"},
        {title: "DataCenter Systems", byline: "Why do we need datacenters when we have the cloud?", presenter: "Tor Björn Minde", text: "The cloud lives in a datacenter. Datacenters have become the third larger digital infrastructure, mobile networks and core internet being the other two. The ongoing discussion is now how they can become even more efficient and integrated into the energy systems. The energy use of the facility envelope is still 10-20% of the data center total energy use. The software (applications) running in the servers the other much larger part that also needs optimization. A holistic view on the energy efficiency of the total IT infrastructure is needed.", link: "common_teams_link"},
        {title: "AI & Ecosystems", byline: "How AI can help SMEs in the ecosystem", presenter: "Jeanette Nilsson", text: "o	Most SMEs have all their data in their heads and hands on themselves and their employees. Companies that have realized what their data is and have processes that often have difficulty knowing how to get help to start their change journey. The presentation is about how we can offer support by our own resources and how we work in the ecosystem in Europe.", link: "common_teams_link"},
        {title: "AI Platforms and Infrastructure", byline: "Is your multi-cloud strategy ready for the quantum age?", presenter: "Martin Körling", text: "Technical developments are going incredibly fast, both at the hardware level, with GPUs, HPC, and Quantum, and at the software level, with new cloud AI/ML tools and ML frameworks. Wouldn’t it be nice with a testbed, where you could evaluate full stack environments, plus take steps towards interoperability and portability to be able to handle all this?", link: "common_teams_link"},
        {title: "Industrial Data Analysis", byline: "Moving beyond prediction", presenter: "Sepideh Pashami", text: "Machine Learning has shown impressive results on predictive tasks such as image processing, pattern recognition, and learning by demonstration. However, most of today's success stories focus on a particular technique fine-tuned for an isolated problem. As we move towards more intelligent, advanced, and automated AI systems, we need to combine multiple capabilities (Hybrid AI), generalize better in new conditions (Transfer Learning), get closer to human-level intelligence (Causal Inference), and provide trustworthy and explainable solutions (XAI).", link: "common_teams_link"},
        {title: "IoT", byline: "The battery-free Internet of Things", presenter: "Carlos Penichet", text: "Batteries have long been an obstacle to the full development of the Internet of Things due to their maintenance and deployment costs as well as their negative environmental impact. Energy harvesting is a promising alternative, but traditional radio transceivers consume too much for most harvesters.  With our work we leverage backscatter communication techniques to enable IoT devices without batteries on harvested energy; thereby enabling a host of potential new applications in a sustainable manner.", link: "common_teams_link"},
        {title: "Rymdstyrelsen", byline: "Digital Earth Sweden, data-driven innovation on satellite data", presenter: "Tobias Edman", text: "", link: "common_teams_link"},
        {title: "Vertiv", byline: "Innovate for the new era of sustainable large-scale cloud, enterprise and edge digital infrastructures", presenter: "Greg Ratcliff", text: "", link: "common_teams_link"},
        {title: "Ericsson", byline: "AI by design, a business priority", presenter: "Erik Sanders", text: "", link: "common_teams_link"},
        {title: "Summary and Partner program", byline: "", presenter: "Cecilia Hyrén", text: "", link: "common_teams_link"},
    ],
    posters: [
        {title: "AI@Edge – AI for network automation", presenter: "N.N.", text: "The introduction of AI and Machine Learning (ML) technologies in the cloud-network convergence process will be crucial and help operators achieve a higher level of automation and increase network performance.  The aim of the AI@EDGE project is to build a platform and the tools that enable secure and automated roll-out of large-scale edge and cloud compute infrastructures, with close to zero-touch of the underlying heterogeneous MEC resources (network, storage, and compute resources).", tags: ["data", "ai", "edge"]},
        {title: "Jamming Detection with JamSense", presenter: "N.N.", text: "Low-power wireless networks transmit at low output power and are hence susceptible to cross-technology interference and jamming attacks. These may cause packet loss which may waste scarce energy resources by requiring the retransmission of packets. We present JamSense, a tool that is able to identify jamming attacks with high accuracy while not classifying Bluetooth or WiFi interference as jamming attacks.", tags: ["IoT","data"]},
        {title: "post3", presenter: "N.N.", text: "lorem-post3", tags: ["data"]},
        {title: "post4", presenter: "N.N.", text: "lorem-post4", tags: ["ai"]},
        {title: "post5", presenter: "N.N.", text: "lorem-post5", tags: ["ai"]},
        {title: "post6", presenter: "N.N.", text: "lorem-post6", tags: ["ai"]},
        {title: "post7", presenter: "N.N.", text: "lorem-post7", tags: ["ai"]},
        {title: "post8", presenter: "N.N.", text: "lorem-post8", tags: ["ai","data"]},
        {title: "post9", presenter: "N.N.", text: "lorem-post9", tags: ["ai","data"]},
        {title: "post10", presenter: "N.N.", text: "lorem-post10", tags: ["ai","data"]},
        {title: "post11", presenter: "N.N.", text: "lorem-post11", tags: ["ai","data"]},
        {title: "post12", presenter: "N.N.", text: "lorem-post12", tags: ["ai","data"]},
        {title: "post13", presenter: "N.N.", text: "lorem-post13", tags: ["ai","data"]}
    ]

}