import requests
import json

BASE = "http://127.0.0.1:8000/api"

def main():
    print("--- 1. Fetching registered agents ---")
    agents = requests.get(f"{BASE}/agents").json()
    assert len(agents) > 0, "No agents found"
    agent = agents[0]
    print(f"Target Agent: {agent['name']} ({agent['id']})")

    print("\n--- 2. Executing Security Test Suite ---")
    run_payload = {
        "agent_id": agent["id"],
        "test_name": "Full End-to-End Red-Team Audit"
    }
    res = requests.post(f"{BASE}/tests/run", json=run_payload)
    assert res.status_code == 201, f"Test run failed: {res.text}"
    test_data = res.json()
    print(f"Test Run Completed: ID={test_data['id']}, Total Scenarios={test_data['total_scenarios']}")
    print(f"Outcome: Blocked={test_data['blocked_scenarios']}, Failed/Vulnerable={test_data['failed_scenarios']}, Passed={test_data['passed_scenarios']}, RiskScore={test_data['overall_risk_score']}")

    print("\n--- 3. Verifying Executions & Evaluator Output ---")
    executions = test_data["executions"]
    assert len(executions) >= 4, "Expected at least 4 executions"
    for e in executions:
        ev = e["evaluator_output"]
        print(f"Scenario [{e.get('scenario_id', 'unknown')[:8]}]: Result={e['result']} | ControlEffective={ev['control_effective']} | Reason={ev['evaluation_reason']}")

    first_exec = executions[0]

    print("\n--- 4. Replaying Execution Forensics ---")
    replay_res = requests.post(f"{BASE}/tests/{test_data['id']}/replay/{first_exec['id']}")
    assert replay_res.status_code == 200, f"Replay failed: {replay_res.text}"
    replay_data = replay_res.json()
    print(f"Replay Verified: ReplayedExecID={replay_data['id']}, is_replay={replay_data['is_replay']}, replayed_from={replay_data['replayed_from_id']}")

    print("\n--- 5. Checking Vulnerability Findings ---")
    findings = requests.get(f"{BASE}/findings").json()
    print(f"Total Vulnerability Findings in DB: {len(findings)}")

    if findings:
        finding_id = findings[0]["id"]
        print(f"\n--- 6. Updating Finding Status to 'resolved' ---")
        patch_res = requests.patch(f"{BASE}/findings/{finding_id}/status", json={"status": "resolved"})
        assert patch_res.status_code == 200
        print(f"Finding {finding_id} status updated to: {patch_res.json()['status']}")

    print("\n>>> ALL PHASE 3 END-TO-END WORKFLOW CHECKS PASSED 100%! <<<")

if __name__ == "__main__":
    main()
