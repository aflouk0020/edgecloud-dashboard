import Header from "./Header";
import Sidebar from "./Sidebar";

function DashboardLayout({ children }) {
  return (
    <div>
      <Header />

      <div style={{ display: "flex", gap: "20px" }}>
        <Sidebar />

        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
