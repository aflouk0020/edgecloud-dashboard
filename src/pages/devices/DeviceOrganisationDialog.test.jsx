import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "../../services/deviceService";
import DeviceOrganisationDialog from "./DeviceOrganisationDialog";

vi.mock("../../services/deviceService", () => ({ getDeviceGroups: vi.fn(), getDeviceTags: vi.fn(), getAssignedDeviceTags: vi.fn(), createDeviceGroup: vi.fn(), createDeviceTag: vi.fn(), updateDeviceGroup: vi.fn(), updateDeviceTag: vi.fn(), deleteDeviceGroup: vi.fn(), deleteDeviceTag: vi.fn(), getGroupMembers: vi.fn(), assignGroupDevices: vi.fn(), removeGroupDevice: vi.fn(), assignDeviceTags: vi.fn() }));

describe("DeviceOrganisationDialog", () => {
  beforeEach(() => { vi.clearAllMocks(); service.getDeviceGroups.mockResolvedValue([]); service.getDeviceTags.mockResolvedValue([]); service.getAssignedDeviceTags.mockResolvedValue([]); });
  it("renders loading and empty states and creates groups and tags", async () => {
    const user = userEvent.setup(); service.createDeviceGroup.mockResolvedValue({}); service.createDeviceTag.mockResolvedValue({});
    render(<DeviceOrganisationDialog projectId="project-1" devices={[]} onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByText(/Loading groups/)).toBeInTheDocument(); await screen.findByText("No groups have been created.");
    await user.type(screen.getByLabelText("Group name"), "Production"); await user.click(screen.getByRole("button", { name: "Create group" }));
    await waitFor(() => expect(service.createDeviceGroup).toHaveBeenCalledWith("project-1", { name: "Production", description: "" }));
    await user.type(screen.getByLabelText("Tag name"), "Critical"); await user.click(screen.getByRole("button", { name: "Create tag" }));
    await waitFor(() => expect(service.createDeviceTag).toHaveBeenCalled());
  });
  it("shows API errors", async () => {
    service.getDeviceGroups.mockRejectedValue(new Error("Project access denied"));
    render(<DeviceOrganisationDialog projectId="project-1" devices={[]} onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Project access denied");
  });
});
