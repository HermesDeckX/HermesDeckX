package web

import "testing"

func TestContainsDangerousInput(t *testing.T) {
	tests := []string{
		"<script>alert(1)</script>",
		`{"name":"<iframe src=x>"}`,
		`onclick="evil()"`,
		`data:text/html,<svg/onload=alert(1)>`,
	}

	for _, input := range tests {
		if !containsDangerousInput(input) {
			t.Fatalf("expected dangerous input to be detected: %q", input)
		}
	}

	if containsDangerousInput(`{"name":"safe"}`) {
		t.Fatal("expected safe input to pass")
	}
}
