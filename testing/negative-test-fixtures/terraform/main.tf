# Part R — Negative Test Fixture: IaC Misconfiguration Detection
#
# This Terraform file intentionally contains well-known, high-severity
# misconfigurations so the negative-test workflow can prove Checkov
# actually detects and blocks on real infrastructure risks. This file
# describes no real resource — it is never applied, never connected to
# a real cloud account, and exists only for this controlled test.

resource "aws_s3_bucket" "negative_test_fixture" {
  bucket = "sentinel-negative-test-fixture-do-not-use"
}

# Intentionally insecure: public read ACL (Checkov: CKV_AWS_20 / CKV_AWS_53 family)
resource "aws_s3_bucket_acl" "negative_test_fixture_acl" {
  bucket = aws_s3_bucket.negative_test_fixture.id
  acl    = "public-read"
}

# Intentionally insecure: security group open to the entire internet on all ports
# (Checkov: CKV_AWS_23 / CKV_AWS_24 family)
resource "aws_security_group" "negative_test_fixture_sg" {
  name        = "sentinel-negative-test-fixture-sg"
  description = "Negative test fixture only — never deployed"

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
