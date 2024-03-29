terraform {
	cloud {
		organization = "hwebs"

		workspaces {
			name = "hwebs"
		}
	}
	required_providers {
		aws = {
			source = "hashicorp/aws"
			version = "~> 4.0"
		}
	}
}

provider "aws" {
	# TODO get from env 
	region = "us-east-2"
}

resource "aws_dynamodb_table" "hwebs_info_table" {
	# TODO get from env
	name = "hwebs-info-table"
	billing_mode = "PROVISIONED"
	read_capacity = 5
	write_capacity = 5
	hash_key = "id"
	range_key = "type"
	
	attribute {
		name = "id"
		type = "S"
	}

	attribute {
		name = "type"
		type = "S"
	}

	attribute {
		name = "category"
		type = "S"
	}

	global_secondary_index {
		name = "post-index"
		hash_key = "category"
		range_key = "id"
		projection_type = "ALL"
		read_capacity = 5
		write_capacity = 5
	}
}

data "aws_iam_policy_document" "assume_role" {
	statement {
	principals {
		type = "Service"
		identifiers = ["dynamodb.amazonaws.com"]
	}
	actions = ["sts:AssumeRole"]
	}
}

resource "aws_iam_role" "hwebs_info_dynamodb_ro_role" {
	name = "hwebs-info-dynamodb-ro"
	assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

data "aws_iam_policy_document" "hwebs_info_dynamodb_ro_policy_document" {
	statement {
		actions = ["dynamodb:DescribeTable", "dynamodb:Query", "dynamodb:Scan", "dynamodb:GetItem"]
		resources = [aws_dynamodb_table.hwebs_info_table.arn]
	}
}

resource "aws_iam_policy" "hwebs_info_dynamodb_ro_policy" {
	name = "hwebs-info-dynamodb-ro-policy"
	description = "Read-only policy for the hwebs-info DynamoDB database"
	policy = data.aws_iam_policy_document.hwebs_info_dynamodb_ro_policy_document.json
}

resource "aws_iam_role_policy_attachment" "hwebs_info_attachment" {
	role = aws_iam_role.hwebs_info_dynamodb_ro_role.name
	policy_arn = aws_iam_policy.hwebs_info_dynamodb_ro_policy.arn
}

