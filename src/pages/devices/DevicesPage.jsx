import { useEffect, useState } from "react";
import { getDevices } from "../../services/deviceService";

export default function DevicesPage() {

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDevices() {

    try {

      setError("");

      const data = await getDevices();

      setDevices(data);

    } catch {

      setError("Unable to load devices");

    } finally {

      setLoading(false);

    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  if (loading) {
    return <h2>Loading devices...</h2>;
  }

  if (error) {
    return <h2>{error}</h2>;
  }

  if (devices.length === 0) {
    return <h2>No registered devices found</h2>;
  }

  return (
    <>
      <h1>Edge Device Monitoring</h1>

      <button onClick={loadDevices}>
        Refresh
      </button>

      <div className="device-grid">

        {devices.map(device => (

          <div
            key={device.id}
            className="device-card"
          >
            <h3>{device.deviceName}</h3>

            <p>
              Type: {device.deviceType}
            </p>

            <p>
              IP: {device.ipAddress}
            </p>

            <p>
              Status:
              {" "}
              <strong>
                {device.status}
              </strong>
            </p>

            <p>
              Registered:
              {" "}
              {device.registeredAt}
            </p>

            <p>
              Last Heartbeat:
              {" "}
              {device.lastHeartbeat || "Never"}
            </p>

          </div>

        ))}

      </div>
    </>
  );
}
